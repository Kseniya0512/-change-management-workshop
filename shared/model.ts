import {
  criteria,
  stateCards,
  goals,
  routes,
  phases,
  actions,
  candidates,
  championCriteria,
  losses,
  objections,
  responses,
  funnel,
  audiences,
  messages,
  metricOptions,
  ceiSteps,
  safeguards,
  functions,
  groups,
} from "./content.ts";
import type { Answers } from "./types.ts";
export const text = (a: Answers, k: string) =>
  typeof a[k] === "string" ? (a[k] as string) : "";
export const list = (a: Answers, k: string) =>
  Array.isArray(a[k]) ? (a[k] as string[]) : [];
const missing = "Требует уточнения";
const value = (a: Answers, k: string) => text(a, k).trim() || missing;
const selected = (a: Answers, k: string) => list(a, k).join("; ") || missing;
export function applicability(a: Answers) {
  const yes = criteria.filter((_, i) => a[`criterion.${i}`] === "yes").length;
  return {
    yes,
    applies: yes >= 2,
    answered: criteria.filter((_, i) => !!a[`criterion.${i}`]).length,
  };
}
export function evaluateStage(stage: number, a: Answers) {
  const issues: string[] = [];
  const needs: string[] = [];
  const need = (k: string, label: string) => {
    if (!text(a, k).trim()) needs.push(label);
  };
  if (stage === 0) {
    need("cei", "Выберите первое действие");
    if (a.cei && a.cei !== "notify")
      issues.push(
        "Сначала инициатор уведомляет ЦЭИ, затем они совместно оценивают применимость. План и массовая коммуникация идут после оценки.",
      );
  }
  if (stage === 1) {
    stateCards.forEach(([label, target], i) => {
      if (!a[`state.${i}`]) needs.push(`Распределите: ${label}`);
      else if (a[`state.${i}`] !== target)
        issues.push(
          `«${label}» относится к «${target === "before" ? "Было" : "Стало"}».`,
        );
    });
    need("goal", "Выберите цель");
    if (a.goal && a.goal !== "adoption")
      issues.push(
        "Установка и разработка не равны изменению поведения. Цель — устойчивые рабочие коммуникации и меньше потерь информации.",
      );
    need("level", "Выберите ступень изменения");
    if (a.level && a.level !== "large")
      issues.push(
        "Это большая ступень: новый способ коммуникаций для всей компании. Пилот не уменьшает масштаб самого изменения.",
      );
  }
  if (stage === 2) {
    criteria.forEach((_, i) => {
      need(`criterion.${i}`, `Критерий ${i + 1}`);
      if (
        ![4, 5, 7].includes(i) &&
        a[`criterion.${i}`] &&
        a[`criterion.${i}`] !== "yes"
      )
        issues.push(
          `Критерий ${i + 1}: в этом кейсе меняются привычки, интересы и навыки всей компании; здесь ответ «Да».`,
        );
    });
  }
  if (stage === 3) {
    [
      "route",
      "scope",
      "urgency",
      "cost",
      "reason",
      "risks",
      "backup",
      "pause",
      "decision",
      "recheck",
      "readiness",
    ].forEach((k) =>
      need(
        k,
        (
          {
            route: "Маршрут",
            scope: "Масштаб",
            urgency: "Срочность",
            cost: "Цена ошибки",
            reason: "Обоснование",
            risks: "Технические риски",
            backup: "Резервный канал",
            pause: "Условия приостановки",
            decision: "Кто принимает решение",
            recheck: "Повторная оценка",
            readiness: "Условия безопасного масштабирования",
          } as Record<string, string>
        )[k],
      ),
    );
    if (list(a, "safeguards").includes("Не учитывать технические проблемы"))
      issues.push(
        "Игнорировать сбои нельзя: коммуникации не исправят нестабильный продукт. Нужны IT, резервный канал и условия остановки.",
      );
    actions.forEach(([_, phase], i) => {
      need(`action.${i}.phase`, `Распределите действие ${i + 1}`);
      if (a[`action.${i}.phase`] && a[`action.${i}.phase`] !== phases[phase])
        issues.push(
          `Действие «${actions[i][0]}» относится к этапу «${phases[phase]}».`,
        );
      need(`action.${i}.owner`, `Ответственный за действие ${i + 1}`);
      need(`action.${i}.when`, `Контрольная точка ${i + 1}`);
      need(`action.${i}.result`, `Результат действия ${i + 1}`);
    });
  }
  if (stage === 4) {
    [
      "sponsor",
      "initiator",
      "projectLead",
      "championsNeeded",
      "championsReason",
    ].forEach((k) =>
      need(
        k,
        k === "sponsor"
          ? "Спонсор"
          : k === "initiator"
            ? "Инициатор"
            : k === "projectLead"
              ? "Руководитель проекта"
              : k === "championsNeeded"
                ? "Нужны ли чемпионы"
                : "Обоснование решения о чемпионах",
      ),
    );
    if (a.sponsor && a.sponsor !== "executive")
      issues.push(
        "Спонсору нужны полномочия, авторитет и ресурсы для общекорпоративного перехода. Технический специалист или автор рассылок не обеспечит это своим назначением.",
      );
    if (!list(a, "functions").length) needs.push("Состав команды изменений");
    if (a.championsNeeded === "yes" && !list(a, "champions").length)
      needs.push("Выберите чемпионов");
    (a.championsNeeded === "yes" ? list(a, "champions") : []).forEach((id) => {
      const c = candidates.find((c) => c.id === id);
      if (c && c.traits.some((v) => !v))
        issues.push(
          `${c.name}: ${c.note} Оцените все пять критериев, а не только знание продукта.`,
        );
    });
  }
  if (stage === 5) {
    if (!list(a, "groups").length) needs.push("Затронутые группы");
    need("lossMap", "Связь групп с реальными/воспринимаемыми потерями");
    for (let i = 0; i < 3; i++) {
      need(`objection.${i}`, `Возражение ${i + 1}`);
      need(`response.${i}`, `Действие по возражению ${i + 1}`);
    }
    if (a.eventResponse && a.eventResponse !== "diagnose")
      issues.push(
        "При 45% использования и сбоях нужно разобрать причины с IT, сохранить резервный канал и пересмотреть масштабирование. Давление и отключение каналов повышают риск.",
      );
  }
  if (stage === 6) {
    const order = list(a, "funnel");
    if (!order.length) needs.push("Соберите воронку");
    else if (order.join("|") !== funnel.join("|"))
      issues.push(
        "Сначала спонсор и топ-менеджеры → линейные руководители → чемпионы → сотрудники → сопровождение → завершение.",
      );
    audiences.forEach((aud, i) => {
      ["message", "channel", "owner", "when"].forEach((k) =>
        need(
          `comm.${i}.${k}`,
          `${aud}: ${k === "message" ? "содержание" : k === "channel" ? "канал" : k === "owner" ? "ответственный" : "срок"}`,
        ),
      );
      if (a[`comm.${i}.message`] && a[`comm.${i}.message`] !== messages[i])
        issues.push(
          `${aud}: сообщение должно соответствовать роли аудитории. ${messages[i]}.`,
        );
    });
    [
      "feedbackTech",
      "feedbackProcess",
      "feedbackOwner",
      "feedbackStatus",
      "feedbackAdjust",
    ].forEach((k) =>
      need(
        k,
        "Обратная связь: " +
          (
            {
              feedbackTech: "технический канал",
              feedbackProcess: "вопросы по процессу",
              feedbackOwner: "ответственный и журнал",
              feedbackStatus: "информирование о статусе",
              feedbackAdjust: "условия корректировки",
            } as Record<string, string>
          )[k],
      ),
    );
  }
  if (stage === 7) {
    const m = list(a, "metrics");
    if (m.length !== 2) needs.push("Выберите ровно две метрики");
    if (m.some((id) => !["active", "communications"].includes(id)))
      issues.push(
        "Скачивания, обучения, рассылки и число чатов показывают активность, но не принятие. Измеряйте регулярное использование и долю рабочих коммуникаций в новом канале.",
      );
    m.forEach((id) =>
      ["target", "when", "source"].forEach((k) =>
        need(
          `metric.${id}.${k}`,
          `${metricOptions.find((m) => m[0] === id)?.[1]}: ${k === "target" ? "цель" : k === "when" ? "срок" : "источник"}`,
        ),
      ),
    );
  }
  return { issues, needs, complete: !issues.length && !needs.length };
}
export interface PlanSection {
  title: string;
  body: string;
  complete: boolean;
}
export function buildPlan(a: Answers): PlanSection[] {
  const app = applicability(a);
  const championNames = list(a, "champions").map(
    (id) => candidates.find((c) => c.id === id)?.name ?? id,
  );
  const mapping = stateCards
    .map(
      ([label], i) =>
        `${label} → ${a[`state.${i}`] === "before" ? "Было" : a[`state.${i}`] === "after" ? "Стало" : missing}`,
    )
    .join("\n");
  const phasePlan = actions
    .map(
      ([label], i) =>
        `${label} — этап: ${value(a, `action.${i}.phase`)}; ответственный: ${value(a, `action.${i}.owner`)}; точка: ${value(a, `action.${i}.when`)}; результат: ${value(a, `action.${i}.result`)}`,
    )
    .join("\n");
  const rows: [string, string][] = [
    ["Было / Стало", mapping],
    ["Цель изменения", goals.find((g) => g[0] === a.goal)?.[1] || missing],
    [
      "Ступень изменения",
      (
        { small: "Небольшая", medium: "Средняя", large: "Большая" } as Record<
          string,
          string
        >
      )[text(a, "level")] || missing,
    ],
    [
      "Восемь критериев и применимость",
      criteria
        .map(
          (c, i) =>
            `${i + 1}. ${c}: ${({ yes: "Да", no: "Нет", clarify: "Нужно уточнить" } as Record<string, string>)[text(a, `criterion.${i}`)] || missing}${text(a, `criterionNote.${i}`) ? " — " + a[`criterionNote.${i}`] : ""}`,
        )
        .join("\n") +
        `\n«Да»: ${app.yes}/8. ${app.answered < 8 ? missing : app.applies ? "Применяем фреймворк (порог 2)." : "Менее двух «Да»: пересмотрите оценку этого масштабного кейса с ЦЭИ."}`,
    ],
    ["Схема внедрения", routes.find((r) => r[0] === a.route)?.[1] || missing],
    [
      "Обоснование маршрута",
      `${value(a, "reason")}\nМасштаб: ${value(a, "scope")}; срочность: ${value(a, "urgency")}; цена ошибки: ${value(a, "cost")}`,
    ],
    [
      "Спонсор и команда изменений",
      `Спонсор: ${({ executive: "Руководитель высокого уровня с полномочиями и ресурсами", developer: "IT-специалист", communications: "Специалист по рассылкам" } as Record<string, string>)[text(a, "sponsor")] || missing}. ${text(a, "sponsorName")}\nИнициатор: ${value(a, "initiator")}; РПИ: ${value(a, "projectLead")}\nКоманда: ${selected(a, "functions")}\nРуководители: ${value(a, "leaders")}`,
    ],
    [
      "Чемпионы и критерии отбора",
      `Нужны: ${({ yes: "Да", no: "Нет" } as Record<string, string>)[text(a, "championsNeeded")] || missing}. Обоснование: ${value(a, "championsReason")}\nВыбраны: ${a.championsNeeded === "no" ? "Не привлекаем по решению команды" : championNames.join(", ") || missing}\nКритерии: ${championCriteria.join("; ")}`,
    ],
    [
      "Затронутые группы",
      selected(a, "groups") +
        (text(a, "otherGroups") ? "\nДругие: " + a.otherGroups : ""),
    ],
    [
      "Реальные и воспринимаемые потери",
      `Выбранные категории: ${selected(a, "losses")}\n${value(a, "lossMap")}`,
    ],
    [
      "Топ-3 возражения",
      [0, 1, 2]
        .map((i) => `${i + 1}. ${value(a, `objection.${i}`)}`)
        .join("\n"),
    ],
    [
      "Работа с сопротивлением",
      [0, 1, 2]
        .map(
          (i) => `${value(a, `objection.${i}`)} → ${value(a, `response.${i}`)}`,
        )
        .join("\n") +
        (a.eventResponse
          ? `\nРешение при сбое: ${({ diagnose: "Анализ причин с IT, резервный канал и корректировка плана", force: "Повторить обязательное требование", disable: "Отключить старые каналы", cancel: "Отменить без анализа" } as Record<string, string>)[text(a, "eventResponse")] || text(a, "eventResponse")}`
          : ""),
    ],
    [
      "Воронка коммуникаций",
      list(a, "funnel")
        .map((f, i) => `${i + 1}. ${f}`)
        .join("\n") || missing,
    ],
    [
      "План коммуникаций и обратная связь",
      audiences
        .map(
          (aud, i) =>
            `${aud}: ${value(a, `comm.${i}.message`)}; канал: ${value(a, `comm.${i}.channel`)}; ответственный: ${value(a, `comm.${i}.owner`)}; срок: ${value(a, `comm.${i}.when`)}`,
        )
        .join("\n") +
        `\nТехнические вопросы: ${value(a, "feedbackTech")}\nВопросы процесса: ${value(a, "feedbackProcess")}\nОбработка и журнал: ${value(a, "feedbackOwner")}\nСтатус исправлений: ${value(a, "feedbackStatus")}\nКорректировка плана: ${value(a, "feedbackAdjust")}`,
    ],
    [
      "Две метрики принятия",
      list(a, "metrics").length === 2
        ? list(a, "metrics")
            .map(
              (id) =>
                `${metricOptions.find((m) => m[0] === id)?.[1] ?? id}: цель ${value(a, `metric.${id}.target`)}; срок ${value(a, `metric.${id}.when`)}; источник ${value(a, `metric.${id}.source`)}`,
            )
            .join("\n")
        : missing,
    ],
    [
      "Технические риски",
      `${value(a, "risks")}\nМеры: ${selected(a, "safeguards")}`,
    ],
    [
      "План Б и безопасное масштабирование",
      `Резервный канал: ${value(a, "backup")}\nПриостанавливаем, если: ${value(a, "pause")}\nРешение принимает: ${value(a, "decision")}\nПовторная оценка: ${value(a, "recheck")}\nУсловия расширения: ${value(a, "readiness")}`,
    ],
    ["Действия по четырём этапам", phasePlan],
    [
      "Ответственные и контрольные точки",
      actions
        .map(
          ([label], i) =>
            `${label}: ${value(a, `action.${i}.owner`)} → ${value(a, `action.${i}.when`)}`,
        )
        .join("\n"),
    ],
    [
      "Открытые вопросы и взаимодействие с ЦЭИ",
      `Первое действие: ${({ notify: "Уведомить ЦЭИ", plan: "Самостоятельно подготовить план, затем показать ЦЭИ", announce: "Объявить обязательную дату перехода", disable: "Попросить IT отключить привычные каналы" } as Record<string, string>)[text(a, "cei")] || missing}\nВопросы команды: ${value(a, "openQuestions")}\nКритерии для уточнения: ${criteria.filter((_, i) => a[`criterion.${i}`] === "clarify").join("; ") || "Не отмечены командой"}\nПять шагов корпоративного процесса (методология):\n${ceiSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    ],
  ];
  return rows.map(([title, body]) => ({
    title,
    body,
    complete: !body.includes(missing),
  }));
}
export function planMarkdown(a: Answers, team = "Команда") {
  return (
    `# План внедрения единого корпоративного мессенджера\n\n${team}\n\n` +
    buildPlan(a)
      .map(
        (s, i) =>
          `## ${i + 1}. ${s.title}\n\nСтатус: ${s.complete ? "Заполнено" : "Требует уточнения"}\n\n${s.body}`,
      )
      .join("\n\n")
  );
}
// Only known fields are accepted; values are bounded before storing them.
export function validField(key: string, value: unknown): boolean {
  const singles = [
    "cei",
    "goal",
    "level",
    "route",
    "scope",
    "urgency",
    "cost",
    "reason",
    "risks",
    "backup",
    "pause",
    "decision",
    "recheck",
    "readiness",
    "sponsor",
    "sponsorName",
    "initiator",
    "projectLead",
    "leaders",
    "championsNeeded",
    "championsReason",
    "lossMap",
    "otherGroups",
    "eventResponse",
    "feedbackTech",
    "feedbackProcess",
    "feedbackOwner",
    "feedbackStatus",
    "feedbackAdjust",
    "openQuestions",
  ];
  const arrays = [
    "safeguards",
    "functions",
    "champions",
    "groups",
    "losses",
    "funnel",
    "metrics",
  ];
  const allowedLists: Record<string, readonly string[]> = {
    safeguards,
    functions,
    champions: candidates.map((c) => c.id),
    groups,
    losses,
    funnel,
    metrics: metricOptions.map((m) => m[0]),
  };
  if (arrays.includes(key))
    return (
      Array.isArray(value) &&
      value.length <= (key === "metrics" ? 2 : 20) &&
      value.every(
        (v) => typeof v === "string" && allowedLists[key].includes(v),
      ) &&
      new Set(value).size === value.length
    );
  const enums: Record<string, readonly string[]> = {
    cei: ["notify", "plan", "announce", "disable"],
    goal: goals.map((g) => g[0]),
    level: ["small", "medium", "large"],
    route: routes.map((r) => r[0]),
    sponsor: ["executive", "developer", "communications"],
    championsNeeded: ["yes", "no"],
    eventResponse: ["force", "disable", "diagnose", "cancel"],
  };
  if (Object.hasOwn(enums, key))
    return typeof value === "string" && enums[key].includes(value);
  if (/^state\./.test(key))
    return (
      /^state\.[0-9]$/.test(key) &&
      ["before", "after"].includes(value as string)
    );
  if (/^criterion\./.test(key))
    return (
      /^criterion\.[0-7]$/.test(key) &&
      ["yes", "no", "clarify"].includes(value as string)
    );
  if (/^action\.[0-3]\.phase$/.test(key))
    return value === "" || phases.includes(value as string);
  if (/^comm\.[0-2]\.message$/.test(key))
    return value === "" || messages.includes(value as string);
  if (/^response\.[0-2]$/.test(key))
    return value === "" || responses.includes(value as string);
  const patterned =
    /^(state\.[0-9]|criterion\.[0-7]|criterionNote\.[0-7]|action\.[0-3]\.(phase|owner|when|result)|objection\.[0-2]|response\.[0-2]|comm\.[0-2]\.(message|channel|owner|when)|metric\.(downloads|active|training|communications|mailings|chats)\.(target|when|source))$/;
  if (!singles.includes(key) && !patterned.test(key)) return false;
  return typeof value === "string" && value.length <= 4000;
}
