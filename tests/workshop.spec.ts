import { test, expect } from "@playwright/test";
test("ведущий создаёт игру, команда синхронизирует ответы и получает реальный план", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Ваше имя").fill("Ведущий теста");
  await page.getByRole("button", { name: "Создать воркшоп" }).click();
  await expect(
    page.getByRole("heading", { name: "Команды готовы к переменам" }),
  ).toBeVisible();
  const state = await (await page.request.get("/api/state")).json();
  const capInvite = state.invites.find((i: any) => i.role === "captain");
  const participant = state.invites.find(
    (i: any) => i.role === "participant" && i.teamId === capInvite.teamId,
  );
  const capContext = await browser.newContext();
  const readContext = await browser.newContext();
  const cap = await capContext.newPage();
  const reader = await readContext.newPage();
  await cap.goto("http://127.0.0.1:3000/#invite=" + capInvite.token);
  await cap.getByLabel("Ваше имя").fill("Капитан Анна");
  await cap.getByRole("button", { name: "Присоединиться" }).click();
  await reader.goto("http://127.0.0.1:3000/#invite=" + participant.token);
  await reader.getByLabel("Ваше имя").fill("Участник Олег");
  await reader.getByRole("button", { name: "Присоединиться" }).click();
  await expect(reader.getByText("Ответы фиксирует капитан")).toBeVisible();
  await cap
    .getByRole("button", {
      name: "Уведомить ЦЭИ и совместно оценить изменение",
      exact: true,
    })
    .click();
  await expect(
    reader.getByRole("button", {
      name: "Уведомить ЦЭИ и совместно оценить изменение",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await cap.getByRole("button", { name: "Проверить решение" }).click();
  await expect(cap.getByText("Правила соблюдены")).toBeVisible();
  await cap.getByRole("button", { name: "Следующее задание" }).click();
  await expect(
    reader.getByRole("heading", { name: "Суть изменения", exact: true }),
  ).toBeVisible();
  await cap.getByRole("button", { name: "3 Схема внедрения" }).click();
  await cap.getByRole("button", { name: /Сразу на всех/ }).click();
  await cap
    .getByLabel("Обоснование маршрута")
    .fill("Единый запуск согласован, резервный канал сохраняется");
  await cap.getByLabel("Обоснование маршрута").blur();
  await expect(reader.getByLabel("Обоснование маршрута")).toHaveValue(
    "Единый запуск согласован, резервный канал сохраняется",
  );
  await cap.reload();
  await expect(cap.getByLabel("Обоснование маршрута")).toHaveValue(
    "Единый запуск согласован, резервный канал сохраняется",
  );
  await cap.getByRole("button", { name: "Итоговый план", exact: true }).click();
  await expect(
    cap.getByRole("heading", { name: "Ваш план внедрения", exact: true }),
  ).toBeVisible();
  await expect(
    cap
      .getByText("Единый запуск согласован, резервный канал сохраняется", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  const download = cap.waitForEvent("download");
  await cap.getByRole("link", { name: "Скачать Markdown" }).click();
  expect((await download).suggestedFilename()).toBe("messenger-plan.md");
  await page.getByRole("button", { name: "Начать 30 минут" }).click();
  await expect(page.getByText("Раунд идёт")).toBeVisible();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect(page.getByText("На паузе")).toBeVisible();
  await expect(cap.getByText("На паузе")).toBeVisible();
  expect(errors).toEqual([]);
  await capContext.close();
  await readContext.close();
});
test("мобильный вход не создаёт горизонтального скролла", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Один мессенджер/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("полное прохождение семи заданий с исправлением ошибок и экспортом 20 разделов", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByLabel("Ваше имя").fill("Ведущий");
  await page.getByRole("button", { name: "Создать воркшоп" }).click();
  await page
    .getByRole("heading", { name: "Команды готовы к переменам" })
    .waitFor();
  const state = await (await page.request.get("/api/state")).json();
  const invite = state.invites.find((i: any) => i.role === "captain");
  const ctx = await browser.newContext();
  const cap = await ctx.newPage();
  await cap.goto("http://127.0.0.1:3000/#invite=" + invite.token);
  await cap.getByLabel("Ваше имя").fill("Капитан");
  await cap.getByRole("button", { name: "Присоединиться" }).click();
  const check = async () => {
    await cap.getByRole("button", { name: "Проверить решение" }).click();
    await expect(cap.getByText("Правила соблюдены")).toBeVisible();
  };
  const next = async () => {
    await cap.getByRole("button", { name: "Следующее задание" }).click();
  };
  await cap
    .getByRole("button", {
      name: "Объявить обязательную дату перехода",
      exact: true,
    })
    .click();
  await cap.getByRole("button", { name: "Проверить решение" }).click();
  await expect(cap.getByText("Есть что пересмотреть")).toBeVisible();
  await cap
    .getByRole("button", {
      name: "Уведомить ЦЭИ и совместно оценить изменение",
      exact: true,
    })
    .click();
  await check();
  await next();
  const before = [0, 2, 4, 6, 8];
  for (let i = 0; i < 10; i++)
    await cap
      .locator(".state-card")
      .nth(i)
      .getByRole("button", {
        name: before.includes(i) ? "Было" : "Стало",
        exact: true,
      })
      .click();
  await cap
    .getByRole("button", {
      name: "Обеспечить устойчивое использование единого канала и сократить потери важной информации",
      exact: true,
    })
    .click();
  await cap.getByRole("button", { name: "Большая", exact: true }).click();
  await check();
  await next();
  for (let i = 0; i < 8; i++)
    await cap
      .locator(".criterion")
      .nth(i)
      .getByRole("button", {
        name: [4, 5, 7].includes(i) ? "Нужно уточнить" : "Да",
        exact: true,
      })
      .click();
  await check();
  await next();
  await cap
    .getByRole("button", { name: "Пилот → масштабирование", exact: true })
    .click();
  for (const [label, value] of [
    ["Масштаб изменения", "Вся компания"],
    ["Срочность", "В течение квартала"],
    ["Цена ошибки", "Потеря критичных сообщений"],
    [
      "Обоснование маршрута",
      "Проверяем на малом контуре до массового перехода",
    ],
    ["Технические риски", "Зависания и задержки сообщений"],
  ] as const)
    await cap.getByLabel(label, { exact: true }).fill(value);
  await cap.getByLabel("Согласовать резервный канал", { exact: true }).check();
  await cap.getByText("План Б и условия расширения", { exact: true }).click();
  for (const [label, value] of [
    ["Согласованный резервный канал", "Корпоративная почта, согласовать с ИБ"],
    ["Когда приостанавливаем масштабирование?", "Критичные сбои мешают работе"],
    ["Кто принимает решение?", "Спонсор и IT"],
    ["Когда повторно оцениваем готовность?", "После исправлений и проверки IT"],
    [
      "Условия безопасного масштабирования",
      "IT подтвердил готовность и сотрудники знают поддержку",
    ],
  ] as const)
    await cap.getByLabel(label, { exact: true }).fill(value);
  await cap.getByText("Мини-план по четырём этапам", { exact: true }).click();
  const phases = ["Подготовка", "Старт", "Основная часть", "Завершение"];
  for (let i = 0; i < 4; i++) {
    const action = cap.locator(".action-card").nth(i);
    await action
      .getByLabel("Этап внедрения", { exact: true })
      .selectOption(phases[i]);
    await action
      .getByLabel("Ответственный", { exact: true })
      .fill("Команда изменений");
    await action
      .getByLabel("Контрольная точка", { exact: true })
      .fill("Согласованная дата");
    await action
      .getByLabel("Ожидаемый результат", { exact: true })
      .fill("Подтверждён на встрече со спонсором");
  }
  await cap
    .getByLabel("Открытые вопросы к ЦЭИ", { exact: true })
    .fill("Уточнить условия отката");
  await check();
  await next();
  await cap
    .getByRole("button", {
      name: "Заинтересованный руководитель высокого уровня с полномочиями, авторитетом и ресурсами",
      exact: true,
    })
    .click();
  await cap.getByLabel("Инициатор изменения", { exact: true }).fill("Дирекция");
  await cap
    .getByRole("textbox", {
      name: "Руководитель проекта изменения",
      exact: true,
    })
    .fill("Назначенный РПИ");
  await cap
    .getByLabel("Ответственность руководителей подразделений", { exact: true })
    .fill("Вовлечение команд и обратная связь");
  for (const label of [
    "Руководитель проекта изменения",
    "IT-команда",
    "Внутренние коммуникации",
    "Техническая поддержка",
    "HR",
    "Представители подразделений",
    "ЦЭИ — методологическая поддержка",
  ])
    await cap.getByRole("checkbox", { name: label, exact: true }).check();
  await cap.getByRole("button", { name: "Да", exact: true }).click();
  await cap
    .getByLabel("Почему приняли такое решение?")
    .fill("Коллегам нужна помощь доверенных людей");
  await cap
    .locator(".candidate")
    .filter({ hasText: "Координатор команды" })
    .click();
  await check();
  await next();
  await cap.getByLabel("Все сотрудники компании", { exact: true }).check();
  await cap.getByLabel("Время", { exact: true }).check();
  await cap.getByLabel("Комфорт", { exact: true }).check();
  await cap
    .getByLabel("Группа → потеря → реальная или воспринимаемая")
    .fill(
      "Сотрудники: реальное время на обучение; воспринимаемая потеря комфорта",
    );
  const obs = [
    "Мессенджер зависает: мы можем пропустить важные сообщения",
    "Зачем переходить, если привычный мессенджер удобнее?",
    "У меня нет времени изучать ещё одно приложение",
  ];
  const resp = [
    "IT: диагностика, исправление и резервный канал",
    "Объяснить цель и пользу изменения",
    "Обучение, инструкции и помощь чемпионов",
  ];
  for (let i = 0; i < 3; i++) {
    await cap.getByLabel(`Формулировка ${i + 1}`, { exact: true }).fill(obs[i]);
    await cap
      .getByLabel(`Действие по возражению ${i + 1}`, { exact: true })
      .selectOption(resp[i]);
  }
  await cap
    .getByText("Неожиданное событие: неделя пилота", { exact: true })
    .click();
  await cap
    .getByRole("button", {
      name: "Разобрать причины с IT, сохранить резервный канал и скорректировать условия масштабирования",
      exact: true,
    })
    .click();
  await check();
  await next();
  const order = [
    "Спонсор и топ-менеджеры",
    "Линейные руководители",
    "Чемпионы изменений",
    "Все сотрудники",
    "Промежуточные коммуникации и сопровождение",
    "Публичное завершение и признание участников",
  ];
  for (let target = 0; target < order.length; target++) {
    let current = (
      await cap.locator(".funnel-row strong").allTextContents()
    ).indexOf(order[target]);
    while (current > target) {
      await cap
        .getByRole("button", { name: `Поднять: ${order[target]}`, exact: true })
        .click();
      current--;
    }
  }
  const msg = [
    "Цель, причины, сроки, ожидаемые действия и работа с сопротивлением",
    "Роль, план, обучение, помощь коллегам и передача обратной связи",
    "Что, зачем и когда меняется; как начать, что делать при сбое и где помощь",
  ];
  for (let i = 0; i < 3; i++) {
    const comm = cap.locator(".comm-card").nth(i);
    await comm
      .getByLabel("Содержание сообщения", { exact: true })
      .selectOption(msg[i]);
    await comm
      .getByLabel("Канал", { exact: true })
      .fill("Встреча и корпоративная почта");
    await comm
      .getByLabel("Ответственный", { exact: true })
      .fill("Команда изменений");
    await comm.getByLabel("Этап или срок", { exact: true }).fill("До старта");
  }
  for (const label of [
    "Канал технической поддержки",
    "Канал вопросов по процессу",
    "Ответственный за обработку и журнал решений",
    "Как сообщаем статус исправлений?",
    "Когда корректируем план по обратной связи?",
  ])
    await cap
      .getByLabel(label, { exact: true })
      .fill("Согласуем на рабочей встрече с IT, ЦЭИ и спонсором");
  await check();
  await next();
  await cap
    .getByLabel("Количество скачиваний приложения", { exact: true })
    .check();
  await cap
    .getByLabel("Количество проведённых обучающих встреч", { exact: true })
    .check();
  await cap.getByRole("button", { name: "Проверить решение" }).click();
  await expect(cap.getByText("Есть что пересмотреть")).toBeVisible();
  await cap
    .getByLabel("Количество скачиваний приложения", { exact: true })
    .uncheck();
  await cap
    .getByLabel("Количество проведённых обучающих встреч", { exact: true })
    .uncheck();
  await cap
    .getByLabel(
      "Доля сотрудников, регулярно использующих мессенджер для работы",
      { exact: true },
    )
    .check();
  await cap
    .getByLabel("Доля рабочих коммуникаций, перешедших в новый канал", {
      exact: true,
    })
    .check();
  for (let i = 0; i < 2; i++) {
    const metric = cap.locator(".metric-card").nth(i);
    await metric
      .getByLabel("Целевое значение", { exact: true })
      .fill(i === 0 ? "85%" : "90%");
    await metric
      .getByLabel("Срок измерения", { exact: true })
      .fill("Через 2 месяца");
    await metric
      .getByLabel("Источник данных", { exact: true })
      .fill("Аналитика и аудит коммуникаций");
  }
  await check();
  await cap.getByRole("button", { name: "Собрать итоговый план" }).click();
  await expect(cap.locator(".plan-section")).toHaveCount(20);
  await expect(
    cap.getByText("20 из 20 разделов заполнено.", { exact: false }),
  ).toBeVisible();
  await cap.reload();
  await expect(cap.locator(".plan-section")).toHaveCount(20);
  const exported = await (
    await cap.request.get(
      `http://127.0.0.1:3000/api/teams/${invite.teamId}/export?format=json`,
    )
  ).json();
  expect(exported.answers.route).toBe("pilot");
  expect(exported.answers.metrics).toEqual(["active", "communications"]);
  expect(exported.answers["objection.0"]).toBe(obs[0]);
  await cap.setViewportSize({ width: 390, height: 844 });
  expect(
    await cap.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await ctx.close();
});

test("конфликт и потеря сети сохраняют черновик до явного решения капитана", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Ваше имя").fill("Ведущий");
  await page.getByRole("button", { name: "Создать воркшоп" }).click();
  await page
    .getByRole("heading", { name: "Команды готовы к переменам" })
    .waitFor();
  const s = await (await page.request.get("/api/state")).json();
  const inv = s.invites.find((i: any) => i.role === "captain");
  await page.goto("/#invite=" + inv.token);
  await page.getByLabel("Ваше имя").fill("Капитан");
  await page.getByRole("button", { name: "Присоединиться" }).click();
  await page.getByRole("button", { name: "3 Схема внедрения" }).click();
  await page
    .getByLabel("Обоснование маршрута")
    .fill("Мой несохранённый вариант");
  await page.request.patch(`/api/teams/${inv.teamId}/answers`, {
    data: { key: "reason", value: "Ответ другого редактора", version: 0 },
  });
  await page.getByLabel("Обоснование маршрута").blur();
  await expect(
    page.getByRole("heading", { name: "Есть несохранённые ответы" }),
  ).toBeVisible();
  await expect(page.getByLabel("Обоснование маршрута")).toHaveValue(
    "Мой несохранённый вариант",
  );
  await page
    .getByRole("button", { name: "Сохранить мой вариант", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Есть несохранённые ответы" }),
  ).toHaveCount(0);
  await page.context().setOffline(true);
  await page
    .getByLabel("Обоснование маршрута")
    .fill("Черновик при потере сети");
  await page.getByLabel("Обоснование маршрута").blur();
  await expect(
    page.getByRole("heading", { name: "Есть несохранённые ответы" }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page
    .getByRole("button", { name: "Сохранить мой вариант", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Есть несохранённые ответы" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Обоснование маршрута")).toHaveValue(
    "Черновик при потере сети",
  );
});
