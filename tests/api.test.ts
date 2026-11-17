import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.ts";

test("серверные роли, изоляция, конфликты, SSE, таймер и сохранение после рестарта", async () => {
  const dir = mkdtempSync(join(tmpdir(), "workshop-"));
  const dbPath = join(dir, "test.db");
  let instance = await createApp({ dbPath });
  let server = instance.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", () => r()));
  let base = `http://127.0.0.1:${(server.address() as any).port}`;
  const request = async (
    path: string,
    body?: unknown,
    cookie = "",
    method?: string,
  ) => {
    const res = await fetch(base + path, {
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    return {
      status: res.status,
      data,
      cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  };
  try {
    const made = await request("/api/rooms", { name: "Ведущий", teamCount: 3 });
    assert.equal(made.status, 201);
    const host = made.cookie;
    const state = made.data;
    const team = state.room.teams[0].id;
    const other = state.room.teams[1].id;
    const inv = (role: string, teamId = team) =>
      state.invites.find((i: any) => i.role === role && i.teamId === teamId)
        .token;
    const cap = (
      await request("/api/join", { token: inv("captain"), name: "Капитан" })
    ).cookie;
    const reader = (
      await request("/api/join", {
        token: inv("participant"),
        name: "Участник",
      })
    ).cookie;
    const curator = (
      await request("/api/join", { token: inv("curator"), name: "Помощник" })
    ).cookie;
    const joined = await request("/api/state", undefined, reader);
    assert.equal(joined.data.room.teams.length, 1);
    assert.equal(joined.data.invites, undefined);
    const patch = (
      key: string,
      value: unknown,
      version = 0,
      cookie = cap,
      target = team,
    ) =>
      request(
        `/api/teams/${target}/answers`,
        { key, value, version },
        cookie,
        "PATCH",
      );
    assert.equal(
      (await patch("reason", "Чужая команда", 0, cap, other)).status,
      403,
    );
    assert.equal((await patch("route", "all", 0, reader)).status, 403);
    assert.equal((await patch("route", "all", 0, curator)).status, 403);
    assert.equal((await patch("__proto__", "bad")).status, 400);
    assert.equal((await patch("reason", "a".repeat(4001))).status, 400);
    assert.equal((await patch("route", "all")).status, 200);
    assert.equal(
      (await patch("reason", "Срочность и резервный канал")).status,
      200,
    ); // independent field can use version 0
    assert.equal((await patch("route", "pilot")).status, 409);
    assert.equal((await patch("route", "pilot", 1)).status, 200);
    assert.equal(
      (
        await request(
          `/api/teams/${team}/comments`,
          { text: "Разделите технические проблемы и сопротивление" },
          curator,
        )
      ).status,
      201,
    );
    const member = joined.data.me.id;
    assert.equal(
      (await request(`/api/members/${member}`, { canEdit: true }, cap, "PATCH"))
        .status,
      200,
    );
    assert.equal((await patch("scope", "Вся компания", 0, reader)).status, 200);
    assert.equal(
      (await request("/api/timer", { action: "start" }, cap)).status,
      403,
    );
    const started = await request("/api/timer", { action: "start" }, host);
    assert.equal(started.data.room.status, "running");
    assert.ok(started.data.room.remainingMs <= 1800000);
    assert.equal(
      (await request("/api/timer", { action: "pause" }, host)).data.room.status,
      "paused",
    );
    const abort = new AbortController();
    const stream = await fetch(base + "/api/events", {
      headers: { Cookie: reader },
      signal: abort.signal,
    });
    assert.equal(
      stream.headers.get("content-type")?.split(";")[0],
      "text/event-stream",
    );
    const first = await stream.body!.getReader().read();
    assert.match(new TextDecoder().decode(first.value), /event: state/);
    abort.abort();
    const exported = await fetch(base + `/api/teams/${team}/export`, {
      headers: { Cookie: cap },
    });
    assert.match(await exported.text(), /Пилот → масштабирование/);
    const badOrigin = await fetch(base + "/api/timer", {
      method: "POST",
      headers: {
        Cookie: host,
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: JSON.stringify({ action: "finish" }),
    });
    assert.equal(badOrigin.status, 403);
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await instance.close();
    instance = await createApp({ dbPath });
    server = instance.app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.on("listening", () => r()));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    const restored = (await request("/api/state", undefined, reader)).data;
    assert.equal(restored.room.teams[0].answers.route, "pilot");
    assert.equal(restored.room.teams[0].answers.scope, "Вся компания");
    assert.equal(restored.comments.length, 1);
    assert.equal(restored.me.canEdit, true);
    assert.equal(restored.room.status, "paused");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await instance.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const revoke of ["logout", "expiry"] as const) {
  test(`SSE прекращает отдавать данные после ${revoke}`, async () => {
    const instance = await createApp({ dbPath: ":memory:" });
    const server = instance.app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.on("listening", () => r()));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 3000);
    try {
      const create = await fetch(base + "/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ведущий", teamCount: 2 }),
      });
      const host = create.headers.get("set-cookie")!.split(";")[0];
      const state = await create.json();
      const inv = state.invites.find((i: any) => i.role === "captain");
      const stream = await fetch(base + "/api/events", {
        headers: { Cookie: host },
        signal: abort.signal,
      });
      const reader = stream.body!.getReader();
      await reader.read();
      if (revoke === "logout")
        await fetch(base + "/api/logout", {
          method: "POST",
          headers: { Cookie: host, "Content-Type": "application/json" },
          body: "{}",
        });
      else instance.store.db.prepare("UPDATE sessions SET expires=0").run();
      assert.equal(
        (await fetch(base + "/api/state", { headers: { Cookie: host } }))
          .status,
        401,
      );
      await fetch(base + "/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Капитан", token: inv.token }),
      });
      const next = await reader.read();
      const received = new TextDecoder().decode(next.value);
      assert.equal(
        received.includes("event: state"),
        false,
        "Отозванный сеанс не должен получать новые снимки",
      );
      assert.ok(next.done || received.includes("event: revoked"));
    } finally {
      clearTimeout(timeout);
      abort.abort();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
      await instance.close();
    }
  });
}

test("истёкший серверный таймер завершает раунд и сохраняет ответы", async () => {
  const instance = await createApp({ dbPath: ":memory:" });
  const server = instance.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", () => r()));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 3000);
  try {
    const created = await fetch(base + "/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ведущий", teamCount: 2 }),
    });
    const cookie = created.headers.get("set-cookie")!.split(";")[0],
      state = await created.json();
    // Persisted fixture models a running round whose deadline elapsed while nobody was connected.
    const room = instance.store.room(state.room.id)!;
    room.status = "running";
    room.endsAt = Date.now() - 1;
    room.teams[0].answers.reason = "Сохранённый ответ";
    instance.store.save(room);
    const stream = await fetch(base + "/api/events", {
      headers: { Cookie: cookie },
      signal: abort.signal,
    });
    const reader = stream.body!.getReader();
    await reader.read();
    let observed = "";
    while (!observed.includes('"status":"finished"')) {
      const next = await reader.read();
      assert.equal(next.done, false);
      observed += new TextDecoder().decode(next.value);
    }
    const restored = await (
      await fetch(base + "/api/state", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(restored.room.status, "finished");
    assert.equal(restored.room.remainingMs, 0);
    assert.equal(restored.room.teams[0].answers.reason, "Сохранённый ответ");
  } finally {
    clearTimeout(timeout);
    abort.abort();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await instance.close();
  }
});
