import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOffline,
  parseOffline,
  loadOffline,
  saveOffline,
  remaining,
} from "../src/offline/store.ts";

test("три независимых листа и таймер 30 минут без заполненных за команду ответов", () => {
  const state = createOffline();
  assert.equal(state.teams.length, 3);
  assert.equal(remaining(state), 1800000);
  assert.deepEqual(state.teams[0].answers, {});
  state.teams[0].answers.route = "all";
  assert.equal(state.teams[1].answers.route, undefined);
});
test("JSON восстанавливает реальный ответ и заканчивает истёкший таймер", () => {
  const state = createOffline();
  state.teams[0].answers.reason = "Срочность согласована";
  state.status = "running";
  state.endsAt = 1000;
  const restored = parseOffline(JSON.stringify(state), 2000);
  assert.equal(restored.teams[0].answers.reason, "Срочность согласована");
  assert.equal(restored.status, "finished");
  assert.equal(remaining(restored, 2000), 0);
});
test("импорт отвергает неизвестные поля, недопустимые значения и повреждённые файлы", () => {
  const state = createOffline();
  state.teams[0].answers.route = "invented";
  assert.throws(() => parseOffline(JSON.stringify(state)));
  state.teams[0].answers = { malicious: "bad" };
  assert.throws(() => parseOffline(JSON.stringify(state)));
  assert.throws(() => parseOffline("{broken"));
});
test("сохранение и загрузка через storage; блокировка хранилища явно сообщается", () => {
  let value: string | null = null;
  const storage = {
    getItem: () => value,
    setItem: (_k: string, v: string) => {
      value = v;
    },
  };
  const state = createOffline();
  state.teams[0].answers.route = "pilot";
  assert.equal(saveOffline(state, storage), "");
  assert.equal(loadOffline(storage).state.teams[0].answers.route, "pilot");
  const denied = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  };
  assert.match(saveOffline(state, denied), /не удалось/i);
  assert.ok(loadOffline(denied).warning);
});

test("копия с пустым или пробельным названием восстанавливает все ответы", () => {
  const state = createOffline();
  state.teams[0].name = "   ";
  state.teams[1].answers.reason = "Не потерять ответы";
  const restored = parseOffline(JSON.stringify(state));
  assert.equal(restored.teams[0].name, "Команда");
  assert.equal(restored.teams[1].answers.reason, "Не потерять ответы");
});

test("локальный таймер не сбрасывает время при паузе, продолжении и восстановлении", async () => {
  const { changeTimer } = await import("../src/offline/store.ts");
  const started = changeTimer(createOffline(), "start", 1000);
  assert.equal(remaining(started, 11000), 1790000);
  const paused = changeTimer(started, "pause", 11000);
  assert.equal(remaining(paused, 999999), 1790000);
  const restored = parseOffline(JSON.stringify(paused), 999999);
  const resumed = changeTimer(restored, "resume", 1000000);
  assert.equal(remaining(resumed, 1010000), 1780000);
});
