import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

test("один HTML работает без сети, сохраняет листы, экспортирует и восстанавливает резервную копию", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  const appUrl = "http://127.0.0.1:4173/offline.html";
  const html = await readFile(resolve("docs/index.html"), "utf8");
  await page.route(appUrl, (route) =>
    route.fulfill({ contentType: "text/html; charset=utf-8", body: html }),
  );
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && r.url() !== appUrl) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await context.setOffline(true);
  await page.goto(appUrl);
  await expect(
    page.getByRole("heading", { name: "Начало путешествия", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ответы хранятся в этом браузере", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Уведомить ЦЭИ и совместно оценить изменение",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Проверить решение", exact: true })
    .click();
  await expect(
    page.getByText("Правила соблюдены", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "3 Схема внедрения", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сразу на всех", exact: true })
    .click();
  await page
    .getByLabel("Обоснование маршрута", { exact: true })
    .fill("Мой план без подключений");
  await page.reload();
  await expect(
    page.getByLabel("Обоснование маршрута", { exact: true }),
  ).toHaveValue("Мой план без подключений");
  await page.getByLabel("Название команды", { exact: true }).fill("   ");
  await page.reload();
  await expect(
    page.getByLabel("Обоснование маршрута", { exact: true }),
  ).toHaveValue("Мой план без подключений");
  await expect(
    page.getByLabel("Название команды", { exact: true }),
  ).toHaveValue("Команда");
  await page
    .getByRole("button", { name: "Начать 30 минут", exact: true })
    .click();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await page.reload();
  await expect(page.getByText("На паузе", { exact: true })).toBeVisible();
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Сохранить резервную копию", exact: true })
    .click();
  const file = await (await backup).path();
  await page
    .getByLabel("Рабочий лист команды", { exact: true })
    .selectOption("team-2");
  await page
    .getByRole("button", { name: "3 Схема внедрения", exact: true })
    .click();
  await expect(
    page.getByLabel("Обоснование маршрута", { exact: true }),
  ).toHaveValue("");
  for (const [index, title] of [
    [1, "Суть изменения"],
    [2, "Нужен ли фреймворк?"],
    [4, "Кто проведёт изменение?"],
    [5, "Кого коснутся перемены?"],
    [6, "Выстроим коммуникации"],
    [7, "Как поймём, что получилось?"],
  ] as const) {
    await page.getByRole("button", { name: new RegExp(`^${index} `) }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    if (index === 2) await expect(page.locator(".criterion")).toHaveCount(8);
  }
  await page
    .getByLabel("Загрузить резервную копию", { exact: true })
    .setInputFiles(file!);
  await page
    .getByRole("button", { name: "Восстановить копию", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Резервная копия восстановлена",
  );
  await expect(
    page.getByLabel("Рабочий лист команды", { exact: true }),
  ).toHaveValue("team-1");
  await expect(
    page.getByLabel("Обоснование маршрута", { exact: true }),
  ).toHaveValue("Мой план без подключений");
  await page
    .getByRole("button", { name: "Итоговый план", exact: true })
    .click();
  await expect(page.locator(".plan-section")).toHaveCount(20);
  await expect(
    page.getByText("Мой план без подключений", { exact: false }).first(),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать Markdown", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("messenger-plan.md");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("запрещённое хранилище не мешает игре и экспорту, предупреждение видно", async ({
  page,
  context,
}) => {
  const html = await readFile(resolve("docs/index.html"), "utf8");
  const appUrl = "http://127.0.0.1:4173/no-storage.html";
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.route(appUrl, (r) =>
    r.fulfill({ contentType: "text/html", body: html }),
  );
  await context.setOffline(true);
  await page.goto(appUrl);
  await page
    .getByRole("button", {
      name: "Уведомить ЦЭИ и совместно оценить изменение",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Не удалось сохранить");
  await page
    .getByRole("button", { name: "Итоговый план", exact: true })
    .click();
  await expect(page.locator(".plan-section")).toHaveCount(20);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Сохранить резервную копию", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("workshop-backup.json");
});
