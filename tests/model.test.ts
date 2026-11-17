import { test } from "node:test";
import assert from "node:assert/strict";
import { criteria, stages } from "../shared/content.ts";
import {
  applicability,
  buildPlan,
  evaluateStage,
  planMarkdown,
} from "../shared/model.ts";

test("восемь критериев и ровно 30 минут", () => {
  assert.equal(criteria.length, 8);
  assert.equal(stages.length, 9);
  assert.equal(
    stages.reduce((n, s) => n + s.minutes, 0),
    30,
  );
});
test("порог два; неотвеченные и уточнения не считаются положительными", () => {
  assert.equal(applicability({ "criterion.0": "yes" }).applies, false);
  assert.equal(
    applicability({
      "criterion.0": "yes",
      "criterion.1": "yes",
      "criterion.4": "clarify",
    }).applies,
    true,
  );
  assert.equal(applicability({ "criterion.4": "clarify" }).yes, 0);
});
test("план из 20 разделов сохраняет реальный маршрут и отмечает пропуски", () => {
  const plan = buildPlan({
    route: "all",
    reason: "Срочность согласована со спонсором",
  });
  assert.equal(plan.length, 20);
  assert.match(plan[4].body, /Сразу на всех/);
  assert.match(plan[5].body, /Срочность согласована/);
  assert.match(planMarkdown({}), /Требует уточнения/);
  assert.doesNotMatch(planMarkdown({}), /85%/);
});
test("критерии 5, 6, 8 могут требовать уточнения; обязательные да проверяются", () => {
  const a = Object.fromEntries(
    criteria.map((_, i) => [
      `criterion.${i}`,
      [4, 5, 7].includes(i) ? "clarify" : "yes",
    ]),
  );
  assert.equal(evaluateStage(2, a).issues.length, 0);
  a["criterion.0"] = "no";
  assert.ok(evaluateStage(2, a).issues.length > 0);
});
test("два показателя активности не доказывают принятие", () => {
  assert.ok(
    evaluateStage(7, { metrics: ["downloads", "training"] }).issues.length > 0,
  );
  assert.equal(
    evaluateStage(7, {
      metrics: ["active", "communications"],
      "metric.active.target": "85%",
      "metric.active.when": "Через 2 месяца",
      "metric.active.source": "Аналитика",
      "metric.communications.target": "90%",
      "metric.communications.when": "Через 2 месяца",
      "metric.communications.source": "Аудит",
    }).issues.length,
    0,
  );
});

test("API принимает только известные варианты выбора и ограничивает две метрики", async () => {
  const { validField } = await import("../shared/model.ts");
  assert.equal(validField("route", "invented"), false);
  assert.equal(validField("criterion.0", "maybe"), false);
  assert.equal(
    validField("metrics", ["active", "communications", "downloads"]),
    false,
  );
  assert.equal(validField("champions", ["unknown"]), false);
  assert.equal(validField("reason", "Обоснованная альтернатива"), true);
});
test("ошибка первого шага в финальном плане остаётся русскоязычной", () => {
  assert.match(
    buildPlan({ cei: "announce" })[19].body,
    /Объявить обязательную дату/,
  );
});

test("смена решения о чемпионах на Нет не оставляет скрытых ошибок кандидатов", () => {
  const result = evaluateStage(4, {
    sponsor: "executive",
    initiator: "Инициатор",
    projectLead: "РПИ",
    functions: ["IT-команда"],
    championsNeeded: "no",
    championsReason: "Согласована адресная поддержка",
    champions: ["oleg"],
  });
  assert.equal(result.complete, true);
});
test("известные поля выпадающих списков можно очищать без ошибки сохранения", async () => {
  const { validField } = await import("../shared/model.ts");
  assert.equal(validField("action.0.phase", ""), true);
  assert.equal(validField("comm.0.message", ""), true);
  assert.equal(validField("response.0", ""), true);
});
