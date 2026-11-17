import express from "express";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Store, hash } from "./store.ts";
import { validField, planMarkdown, evaluateStage } from "../shared/model.ts";
import type { Member, Room } from "../shared/types.ts";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Auth = { roomId: string; member: Member; sessionHash: string };
type Connection = {
  roomId: string;
  memberId: string;
  sessionHash: string;
  res: Response;
};
export async function createApp({ dbPath }: { dbPath: string }) {
  const store = new Store(dbPath);
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store",
    });
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin")) {
      let valid = false;
      try {
        valid =
          new URL(req.get("origin")!).host === req.get("host") ||
          req.get("origin") === process.env.PUBLIC_ORIGIN;
      } catch {}
      if (!valid) {
        res.status(403).json({ error: "Запрос с другого сайта отклонён" });
        return;
      }
    }
    next();
  });
  const connections = new Set<Connection>();
  function authorizeStream(c: Connection) {
    const session = store.sessionByHash(c.sessionHash);
    if (session?.member_id === c.memberId && session.room_id === c.roomId)
      return true;
    c.res.write("event: revoked\ndata: {}\n\n");
    c.res.end();
    connections.delete(c);
    return false;
  }
  function send(c: Connection) {
    if (!authorizeStream(c)) return;
    c.res.write(
      `event: state\ndata: ${JSON.stringify(store.snapshot(c.roomId, c.memberId))}\n\n`,
    );
  }
  const broadcast = (roomId: string) => {
    for (const c of connections) if (c.roomId === roomId) send(c);
  };
  const limiter = new Map<string, { count: number; at: number }>();
  function rate(req: Request) {
    const ip = req.ip ?? "unknown";
    let entry = limiter.get(ip);
    if (!entry || Date.now() - entry.at > 60000) {
      entry = { count: 0, at: Date.now() };
      limiter.set(ip, entry);
    }
    if (++entry.count > 60)
      throw new HttpError(
        429,
        "Слишком много запросов. Повторите через минуту.",
      );
    if (limiter.size > 10000)
      for (const [k, v] of limiter)
        if (Date.now() - v.at > 60000) limiter.delete(k);
  }
  function auth(req: Request): Auth {
    const cookie =
      req
        .get("cookie")
        ?.split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("workshop_session="))
        ?.slice(17) ?? "";
    const session = store.session(cookie);
    if (!session) throw new HttpError(401, "Войдите в комнату по приглашению");
    const member = store.member(session.member_id)!;
    return { roomId: session.room_id, member, sessionHash: hash(cookie) };
  }
  function teamAuth(req: Request, write = false) {
    const a = auth(req);
    const room = store.room(a.roomId)!;
    const team = room.teams.find((t) => t.id === req.params.id);
    if (!team || (a.member.role !== "host" && team.id !== a.member.teamId))
      throw new HttpError(403, "Нет доступа к этой команде");
    if (
      write &&
      a.member.role !== "captain" &&
      !(a.member.role === "participant" && a.member.canEdit)
    )
      throw new HttpError(
        403,
        "Ответы фиксирует капитан или уполномоченный участник",
      );
    return { ...a, room, team };
  }
  function login(res: Response, member: Member) {
    const token = store.addSession(member.id);
    res.cookie("workshop_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV === "production" &&
        process.env.COOKIE_SECURE !== "false",
      maxAge: 7 * 86400000,
      path: "/",
    });
  }
  const person = z.string().trim().min(1).max(60);
  app.get("/api/health", (_req, res) => {
    store.db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });
  app.post("/api/rooms", (req, res) => {
    rate(req);
    const { name, teamCount } = z
      .object({
        name: person,
        teamCount: z.union([z.literal(2), z.literal(3)]),
      })
      .parse(req.body);
    const member: Member = {
      id: randomUUID(),
      name,
      role: "host",
      teamId: null,
      canEdit: false,
    };
    const room: Room = {
      id: randomUUID(),
      title: "Один мессенджер — одна компания",
      teams: Array.from({ length: teamCount }, (_, i) => ({
        id: randomUUID(),
        name: `Команда ${i + 1}`,
        answers: {},
        versions: {},
        step: 0,
        checked: [],
      })),
      status: "waiting",
      remainingMs: 1800000,
      endsAt: null,
      event: false,
      createdAt: Date.now(),
    };
    store.transaction(() => {
      store.save(room);
      store.saveMember(room.id, member);
      store.invite(room.id, null, "host");
      for (const t of room.teams)
        for (const role of ["captain", "curator", "participant"] as const)
          store.invite(room.id, t.id, role);
      login(res, member);
    });
    res.status(201).json(store.snapshot(room.id, member.id));
  });
  app.post("/api/join", (req, res) => {
    rate(req);
    const { token, name } = z
      .object({ token: z.string().min(32).max(100), name: person })
      .parse(req.body);
    const invite = store.resolveInvite(token);
    if (!invite)
      throw new HttpError(
        404,
        "Приглашение не найдено. Проверьте ссылку у ведущего.",
      );
    const member: Member = {
      id: randomUUID(),
      name,
      role: invite.role,
      teamId: invite.team_id,
      canEdit: false,
    };
    store.transaction(() => {
      store.saveMember(invite.room_id, member);
      login(res, member);
    });
    res.json(store.snapshot(invite.room_id, member.id));
    broadcast(invite.room_id);
  });
  app.post("/api/logout", (req, res) => {
    const cookie = req
      .get("cookie")
      ?.match(/(?:^|;\s*)workshop_session=([^;]+)/)?.[1];
    if (cookie) {
      store.db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(cookie));
      for (const c of connections)
        if (c.sessionHash === hash(cookie)) authorizeStream(c);
    }
    res.clearCookie("workshop_session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/state", (req, res) => {
    const a = auth(req);
    res.json(store.snapshot(a.roomId, a.member.id));
  });
  app.patch("/api/teams/:id/answers", (req, res) => {
    const { key, value, version } = z
      .object({
        key: z.string().max(80),
        value: z.union([z.string(), z.array(z.string())]),
        version: z.number().int().nonnegative(),
      })
      .parse(req.body);
    if (!validField(key, value))
      throw new HttpError(400, "Недопустимое поле или слишком длинный ответ");
    const a = teamAuth(req, true);
    const current = a.team.versions[key] ?? 0;
    if (current !== version) {
      res.status(409).json({
        error:
          "Ответ в этом поле уже изменён другим участником. Ваш текст сохранён в поле; сравните с актуальным ответом команды.",
        snapshot: store.snapshot(a.roomId, a.member.id),
      });
      return;
    }
    a.team.answers[key] = value;
    a.team.versions[key] = current + 1;
    store.save(a.room);
    res.json(store.snapshot(a.roomId, a.member.id));
    broadcast(a.roomId);
  });
  app.patch("/api/teams/:id/step", (req, res) => {
    const a = teamAuth(req, true);
    const { step } = z
      .object({ step: z.number().int().min(0).max(8) })
      .parse(req.body);
    a.team.step = step;
    store.save(a.room);
    res.json(store.snapshot(a.roomId, a.member.id));
    broadcast(a.roomId);
  });
  app.post("/api/teams/:id/check", (req, res) => {
    const a = teamAuth(req, true);
    const { stage } = z
      .object({ stage: z.number().int().min(0).max(7) })
      .parse(req.body);
    if (!a.team.checked.includes(stage)) a.team.checked.push(stage);
    store.save(a.room);
    res.json({
      result: evaluateStage(stage, a.team.answers),
      snapshot: store.snapshot(a.roomId, a.member.id),
    });
    broadcast(a.roomId);
  });
  app.post("/api/teams/:id/comments", (req, res) => {
    const a = teamAuth(req);
    const { text } = z
      .object({ text: z.string().trim().min(1).max(2000) })
      .parse(req.body);
    const c = {
      id: randomUUID(),
      teamId: a.team.id,
      author: a.member.name,
      role: a.member.role,
      text,
      at: Date.now(),
    };
    store.db
      .prepare("INSERT INTO comments VALUES (?,?,?,?)")
      .run(c.id, a.roomId, a.team.id, JSON.stringify(c));
    res.status(201).json(store.snapshot(a.roomId, a.member.id));
    broadcast(a.roomId);
  });
  app.patch("/api/members/:id", (req, res) => {
    const a = auth(req);
    const { canEdit } = z.object({ canEdit: z.boolean() }).parse(req.body);
    const m = store.member(String(req.params.id));
    if (
      !m ||
      m.role !== "participant" ||
      !store
        .snapshot(a.roomId, a.member.id)
        .members.some((v) => v.id === m.id) ||
      (a.member.role !== "host" &&
        !(a.member.role === "captain" && a.member.teamId === m.teamId))
    )
      throw new HttpError(403, "Нет прав на изменение роли");
    m.canEdit = canEdit;
    store.saveMember(a.roomId, m);
    res.json(store.snapshot(a.roomId, a.member.id));
    broadcast(a.roomId);
  });
  app.post("/api/timer", (req, res) => {
    const a = auth(req);
    if (a.member.role !== "host")
      throw new HttpError(403, "Таймером управляет ведущий");
    const { action } = z
      .object({
        action: z.enum(["start", "pause", "resume", "finish", "event"]),
      })
      .parse(req.body);
    const room = store.room(a.roomId)!;
    const now = Date.now();
    if (action === "start" && room.status === "waiting") {
      room.status = "running";
      room.endsAt = now + room.remainingMs;
    } else if (action === "pause" && room.status === "running") {
      room.remainingMs = Math.max(0, (room.endsAt ?? now) - now);
      room.endsAt = null;
      room.status = room.remainingMs === 0 ? "finished" : "paused";
    } else if (action === "resume" && room.status === "paused") {
      room.status = "running";
      room.endsAt = now + room.remainingMs;
    } else if (action === "finish") {
      room.remainingMs =
        room.status === "running"
          ? Math.max(0, (room.endsAt ?? now) - now)
          : room.remainingMs;
      room.status = "finished";
      room.endsAt = null;
    } else if (action === "event") room.event = true;
    else
      throw new HttpError(
        409,
        "Это действие недоступно в текущем состоянии раунда",
      );
    store.save(room);
    res.json(store.snapshot(a.roomId, a.member.id));
    broadcast(a.roomId);
  });
  app.get("/api/teams/:id/export", (req, res) => {
    const a = teamAuth(req);
    const json = req.query.format === "json";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="messenger-plan.${json ? "json" : "md"}"`,
    );
    res.type(json ? "application/json" : "text/markdown").send(
      json
        ? JSON.stringify(
            {
              team: a.team.name,
              answers: a.team.answers,
              exportedAt: new Date().toISOString(),
            },
            null,
            2,
          )
        : planMarkdown(a.team.answers, a.team.name),
    );
  });
  app.get("/api/events", (req, res) => {
    const a = auth(req);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const c = {
      roomId: a.roomId,
      memberId: a.member.id,
      sessionHash: a.sessionHash,
      res,
    };
    connections.add(c);
    send(c);
    req.on("close", () => connections.delete(c));
  });
  const heartbeat = setInterval(() => {
    for (const c of connections)
      if (authorizeStream(c)) c.res.write(": heartbeat\n\n");
    for (const r of store.db.prepare("SELECT id,data FROM rooms").all() as {
      id: string;
      data: string;
    }[]) {
      const room = JSON.parse(r.data) as Room;
      if (
        room.status === "running" &&
        room.endsAt !== null &&
        room.endsAt <= Date.now()
      ) {
        room.remainingMs = 0;
        room.endsAt = null;
        room.status = "finished";
        store.save(room);
        broadcast(room.id);
      }
    }
  }, 1000);
  heartbeat.unref();
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Метод API не найден" }),
  );
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error:
          "Проверьте поля формы: " +
          err.issues.map((i) => i.path.join(".")).join(", "),
      });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Некорректный формат запроса" });
      return;
    }
    console.error(
      "Ошибка сервера:",
      err instanceof Error ? err.message : "unknown",
    );
    res
      .status(500)
      .json({ error: "Не удалось выполнить запрос. Повторите позже." });
  });
  return {
    app,
    store,
    close: async () => {
      clearInterval(heartbeat);
      for (const c of connections) c.res.end();
      store.close();
    },
  };
}
