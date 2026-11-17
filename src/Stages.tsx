import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  ShieldCheck,
  Sparkles,
  Users,
  MessageCircle,
  ArrowRight,
  Download,
  Printer,
  FileText,
} from "lucide-react";
import {
  Block,
  Choices,
  Field,
  Multi,
  Notice,
  Select,
  useForm,
} from "./components";
import * as c from "../shared/content";
import { applicability, buildPlan, list, text } from "../shared/model";

function Intro() {
  return (
    <>
      <div className="case-hero">
        <div>
          <span className="eyebrow">ПРАКТИКА УПРАВЛЕНИЯ ИЗМЕНЕНИЯМИ</span>
          <h2>
            Один мессенджер.
            <br />
            Одна компания.
          </h2>
          <p>
            За 30 минут превратите сложный переход в понятный план. Вместе с
            командой.
          </p>
          <div className="hero-tags">
            <span>
              <Users size={15} /> 2–3 команды
            </span>
            <span>
              <FileText size={15} /> Свой план на выходе
            </span>
          </div>
        </div>
        <div className="chat-art" aria-hidden="true">
          <div className="chat-card chat-back">
            <span className="avatar violet">А</span>
            <div>
              <b>А где обсуждаем проект?</b>
              <i>В старом чате или новом?</i>
            </div>
          </div>
          <div className="chat-card chat-front">
            <span className="avatar lime">
              <MessageCircle size={20} />
            </span>
            <div>
              <b>Всё важное — в одном месте</b>
              <i>
                <span className="online-dot" /> Единое пространство команды
              </i>
            </div>
            <span className="chat-check">
              <Check size={16} />
            </span>
          </div>
          <div className="art-label">
            <Sparkles size={14} /> Будущее начинается с диалога
          </div>
        </div>
      </div>
      <div className="case-columns">
        <div>
          <span className="eyebrow">СЕЙЧАС</span>
          <h3>Сообщения теряются</h3>
          <p>
            Рабочие чаты в разных приложениях, дублирование информации,
            непонятные правила и сложный поиск контактов.
          </p>
        </div>
        <ArrowRight size={24} />
        <div>
          <span className="eyebrow">КУДА ИДЁМ</span>
          <h3>Единый рабочий канал</h3>
          <p>
            Общее пространство коммуникаций, понятные правила и меньше
            пропущенной важной информации.
          </p>
        </div>
      </div>
      <Notice type="warning">
        <strong>Есть важное «но».</strong> Новый мессенджер периодически
        зависает, сообщения приходят с задержкой. IT устраняет проблемы. Часть
        сотрудников и руководителей не готова переходить.
      </Notice>
      <Block
        number="01"
        title="С чего начнём?"
        description="Выберите первое действие по корпоративному фреймворку."
      >
        <Choices
          name="cei"
          options={[
            ["plan", "Самостоятельно подготовить план, а потом показать ЦЭИ"],
            ["notify", "Уведомить ЦЭИ и совместно оценить изменение"],
            ["announce", "Объявить обязательную дату перехода"],
            ["disable", "Попросить IT отключить привычные каналы"],
          ]}
        />
      </Block>
      <p className="quiet">
        Таймер запускает ведущий. Время заданий — ориентир: можно вернуться и
        исправить ответы без штрафов.
      </p>
    </>
  );
}
function Essence() {
  const f = useForm();
  return (
    <>
      <Block
        number="01"
        title="Разложите «Было / Стало»"
        description="Для каждой карточки выберите текущее или целевое состояние. Можно работать с клавиатуры."
      >
        <div className="state-grid">
          {c.stateCards.map(([label], i) => (
            <div
              className={"state-card " + (text(f.answers, `state.${i}`) || "")}
              key={i}
            >
              <span>{label}</span>
              <Choices
                name={`state.${i}`}
                compact
                options={[
                  ["before", "Было"],
                  ["after", "Стало"],
                ]}
              />
            </div>
          ))}
        </div>
      </Block>
      <Block number="02" title="Какую цель мы преследуем?">
        <Choices name="goal" options={c.goals} />
      </Block>
      <Block number="03" title="Насколько большая ступень изменения?">
        <Choices
          name="level"
          options={[
            [
              "small",
              "Небольшая",
              "Достаточно узнать о новом инструменте, привычная работа почти не меняется.",
            ],
            [
              "medium",
              "Средняя",
              "Меняется отдельный инструмент у ограниченной группы.",
            ],
            [
              "large",
              "Большая",
              "Вся компания меняет привычный способ коммуникаций и отказывается от прежних каналов.",
            ],
          ]}
        />
      </Block>
    </>
  );
}
function Checklist() {
  const f = useForm(),
    app = applicability(f.answers);
  return (
    <>
      <Notice>
        Ответьте на восемь вопросов. Если набралось{" "}
        <strong>два и более «да»</strong>, применяем фреймворк.
      </Notice>
      <div className="criteria-list">
        {c.criteria.map((criterion, i) => (
          <section className="criterion" key={i}>
            <div className="criterion-top">
              <span className="criterion-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{criterion}</h2>
            </div>
            <Choices
              name={`criterion.${i}`}
              compact
              options={[
                ["yes", "Да"],
                ["no", "Нет"],
                ["clarify", "Нужно уточнить"],
              ]}
            />
            {["clarify"].includes(text(f.answers, `criterion.${i}`)) && (
              <Field
                name={`criterionNote.${i}`}
                label="Что уточнить с ЦЭИ?"
                placeholder="Какой информации пока не хватает?"
              />
            )}
          </section>
        ))}
      </div>
      <div className="criteria-total">
        <span>
          <strong>{app.yes}</strong> из 8 положительных ответов
        </span>
        <span>{app.answered}/8 заполнено</span>
      </div>
    </>
  );
}
function Route() {
  const f = useForm();
  return (
    <>
      <Block
        number="01"
        title="Выберите схему внедрения"
        description="Компания в итоге переходит целиком. Маршрут перехода выбираете вы."
      >
        <Choices name="route" options={c.routes} />
      </Block>
      {f.answers.route === "all" && (
        <Notice type="warning">
          <strong>Единый запуск при нестабильном продукте.</strong> Как
          предотвратите потерю важных сообщений при массовом сбое? Обоснуйте
          решение и выберите меры ниже.
        </Notice>
      )}
      <Block number="02" title="На чём основан выбор?">
        <div className="form-grid">
          <Field
            name="scope"
            label="Масштаб изменения"
            placeholder="Кого и сколько сотрудников затронет"
          />
          <Field
            name="urgency"
            label="Срочность"
            placeholder="Срок и причина срочности"
          />
          <Field
            name="cost"
            label="Цена ошибки"
            placeholder="Что произойдёт при сбое"
          />
        </div>
        <Field
          name="reason"
          label="Обоснование маршрута"
          multiline
          placeholder="Мы выбираем …, потому что … (масштаб, срочность, цена ошибки, технические риски)"
        />
      </Block>
      <Block number="03" title="Сохраним рабочие коммуникации">
        <Field
          name="risks"
          label="Технические риски"
          multiline
          placeholder="Какие сбои могут помешать работе?"
        />
        <Multi name="safeguards" options={c.safeguards} />
        <details
          className="details"
          open={f.answers.route === "all" ? true : undefined}
        >
          <summary>
            <ShieldCheck size={18} /> План Б и условия расширения
          </summary>
          <div className="form-grid">
            <Field
              name="backup"
              label="Согласованный резервный канал"
              placeholder="Канал, соответствующий корпоративным требованиям"
            />
            <Field
              name="pause"
              label="Когда приостанавливаем масштабирование?"
            />
            <Field name="decision" label="Кто принимает решение?" />
            <Field
              name="recheck"
              label="Когда повторно оцениваем готовность?"
            />
          </div>
          <Field
            name="readiness"
            label="Условия безопасного масштабирования"
            multiline
            placeholder="Что проверяем с IT и спонсором до расширения? Не придумывайте технические нормативы."
          />
        </details>
      </Block>
      <details className="details">
        <summary>
          <FileText size={18} /> Мини-план по четырём этапам
        </summary>
        <p className="quiet">
          Четыре этапа внедрения вложены в корпоративный процесс ЦЭИ.
          Распределите действия, задайте владельцев и контрольные точки.
        </p>
        {c.actions.map(([action], i) => (
          <div className="action-card" key={i}>
            <h3>{action}</h3>
            <div className="form-grid">
              <Select
                name={`action.${i}.phase`}
                label="Этап внедрения"
                options={c.phases}
              />
              <Field name={`action.${i}.owner`} label="Ответственный" />
              <Field name={`action.${i}.when`} label="Контрольная точка" />
              <Field name={`action.${i}.result`} label="Ожидаемый результат" />
            </div>
          </div>
        ))}
        <Field name="openQuestions" label="Открытые вопросы к ЦЭИ" multiline />
      </details>
    </>
  );
}
function Roles() {
  const f = useForm();
  return (
    <>
      <Block number="01" title="Кто станет спонсором изменения?">
        <Choices
          name="sponsor"
          options={[
            ["developer", "IT-специалист, разработавший мессенджер"],
            [
              "executive",
              "Заинтересованный руководитель высокого уровня с полномочиями, авторитетом и ресурсами",
            ],
            ["communications", "Сотрудник, который готовит рассылки"],
          ]}
        />
        <div className="form-grid">
          <Field name="sponsorName" label="Имя или должность спонсора" />
          <Field name="initiator" label="Инициатор изменения" />
          <Field name="projectLead" label="Руководитель проекта изменения" />
          <Field
            name="leaders"
            label="Ответственность руководителей подразделений"
            placeholder="Как организуют переход в своих командах?"
          />
        </div>
      </Block>
      <Notice>
        Куратор-помощник на воркшопе помогает обсуждать задания. Спонсор
        изменения даёт полномочия и ресурсы. Это разные роли.
      </Notice>
      <Block
        number="02"
        title="Соберите команду изменений"
        description="Какие функции нужны для перехода? ЦЭИ поддерживает методологию, IT отвечает за продукт."
      >
        <Multi name="functions" options={c.functions} />
      </Block>
      <Block number="03" title="Нужны ли нам чемпионы?">
        <Choices
          name="championsNeeded"
          compact
          options={[
            ["yes", "Да"],
            ["no", "Нет"],
          ]}
        />
        <Field
          name="championsReason"
          label="Почему приняли такое решение?"
          multiline
        />
      </Block>
      {f.answers.championsNeeded === "yes" && (
        <Block
          number="04"
          title="Кому команда доверит помогать?"
          description="Учебные кандидаты. Оцените каждого по пяти критериям."
        >
          <div className="candidate-grid">
            {c.candidates.map((candidate) => {
              const selected = list(f.answers, "champions").includes(
                candidate.id,
              );
              return (
                <button
                  className={"candidate " + (selected ? "selected" : "")}
                  key={candidate.id}
                  disabled={!f.editable}
                  aria-pressed={selected}
                  onClick={() =>
                    f.set(
                      "champions",
                      selected
                        ? list(f.answers, "champions").filter(
                            (id) => id !== candidate.id,
                          )
                        : [...list(f.answers, "champions"), candidate.id],
                      true,
                    )
                  }
                >
                  <span className="candidate-head">
                    <span className="avatar">{candidate.name[0]}</span>
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{candidate.job}</small>
                    </span>
                    <span className="choice-mark">
                      {selected && <Check size={14} />}
                    </span>
                  </span>
                  <p>{candidate.note}</p>
                  <span className="candidate-traits">
                    {c.championCriteria.map((criterion, i) => (
                      <span
                        key={criterion}
                        className={
                          candidate.traits[i] ? "trait-yes" : "trait-no"
                        }
                      >
                        {candidate.traits[i] ? "✓" : "!"} {criterion}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Block>
      )}
    </>
  );
}
function Stakeholders({ event }: { event: boolean }) {
  const f = useForm();
  return (
    <>
      <Block
        number="01"
        title="Кого коснётся переход?"
        description="Отметьте группы и при необходимости добавьте свои."
      >
        <Multi name="groups" options={c.groups} />
        {list(f.answers, "groups").includes("Другие группы") && (
          <Field name="otherGroups" label="Другие затронутые группы" />
        )}
      </Block>
      <Block
        number="02"
        title="Что люди могут потерять?"
        description="Не у всех групп есть потери во всех категориях. Важно учитывать реальные и воспринимаемые потери."
      >
        <Multi name="losses" options={c.losses} />
        <Field
          name="lossMap"
          label="Группа → потеря → реальная или воспринимаемая"
          multiline
          placeholder="Например: линейные руководители → ощущение потери контроля над привычными чатами → воспринимаемая потеря статуса. Или обоснуйте отсутствие потерь."
        />
      </Block>
      <Block
        number="03"
        title="Три главных возражения"
        description="Выберите из примеров или напишите своё. Для каждого определите действие."
      >
        <datalist id="objection-examples">
          {c.objections.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        {[0, 1, 2].map((i) => (
          <div className="objection-card" key={i}>
            <span className="eyebrow">ВОЗРАЖЕНИЕ {i + 1}</span>
            <label className="field">
              <span>Формулировка {i + 1}</span>
              <input
                list="objection-examples"
                maxLength={4000}
                value={text(f.answers, `objection.${i}`)}
                disabled={!f.editable}
                placeholder={c.objections[i]}
                onChange={(e) => f.set(`objection.${i}`, e.target.value)}
                onBlur={() => f.commit(`objection.${i}`)}
              />
            </label>
            <Select
              name={`response.${i}`}
              label={`Действие по возражению ${i + 1}`}
              options={c.responses}
            />
          </div>
        ))}
      </Block>
      <details className="details event-card" open={event || undefined}>
        <summary>
          <Sparkles size={18} /> Неожиданное событие: неделя пилота
        </summary>
        <h3>Только 45% участников используют мессенджер</h3>
        <p>
          Сообщения задерживаются, сотрудники возвращаются в старые чаты. IT ещё
          устраняет ошибки. Это учебная ситуация, а не результат вашей команды.
        </p>
        <Choices
          name="eventResponse"
          options={[
            ["force", "Повторно разослать обязательное требование"],
            ["disable", "Немедленно отключить старые каналы"],
            [
              "diagnose",
              "Разобрать причины с IT, сохранить резервный канал и скорректировать условия масштабирования",
            ],
            ["cancel", "Отменить внедрение без анализа"],
          ]}
        />
        <Notice>
          Сверьтесь со своим планом Б на этапе «Схема внедрения». При критичных
          сбоях нельзя расширять запуск до решения проблемы. Обучение и
          коммуникации помогают людям, но не исправляют продукт.
        </Notice>
      </details>
    </>
  );
}
function Communications() {
  const f = useForm();
  const order = list(f.answers, "funnel").length
    ? list(f.answers, "funnel")
    : c.initialFunnel;
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || !f.editable) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    f.set("funnel", next, true);
  };
  return (
    <>
      <Block
        number="01"
        title="Соберите воронку вовлечения"
        description="Перетаскивайте карточки или используйте стрелки. С кем поговорим сначала?"
      >
        <div className="funnel">
          {order.map((aud, i) => (
            <div
              key={aud}
              className="funnel-row"
              draggable={f.editable}
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null) move(drag, i);
                setDrag(null);
              }}
              style={{ "--row": i } as React.CSSProperties}
            >
              <GripVertical size={17} />
              <span className="funnel-num">{i + 1}</span>
              <strong>{aud}</strong>
              <button
                className="icon-btn"
                aria-label={`Поднять: ${aud}`}
                disabled={!f.editable || i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-btn"
                aria-label={`Опустить: ${aud}`}
                disabled={!f.editable || i === order.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown size={16} />
              </button>
            </div>
          ))}
        </div>
        {!list(f.answers, "funnel").length && (
          <button
            className="btn secondary small"
            disabled={!f.editable}
            onClick={() => f.set("funnel", order, true)}
          >
            Зафиксировать эту последовательность
          </button>
        )}
      </Block>
      <Block number="02" title="Что, кому и когда сообщаем?">
        <div className="communications">
          {c.audiences.map((aud, i) => (
            <div className="comm-card" key={aud}>
              <h3>
                <span className="avatar">
                  <Users size={18} />
                </span>
                {aud}
              </h3>
              <Select
                name={`comm.${i}.message`}
                label="Содержание сообщения"
                options={c.messages}
              />
              <div className="form-grid">
                <Field
                  name={`comm.${i}.channel`}
                  label="Канал"
                  placeholder="Встреча, почта, демонстрация…"
                />
                <Field name={`comm.${i}.owner`} label="Ответственный" />
                <Field name={`comm.${i}.when`} label="Этап или срок" />
              </div>
            </div>
          ))}
        </div>
      </Block>
      <details className="details" open>
        <summary>
          <MessageCircle size={18} /> Обратная связь, которая не потеряется
        </summary>
        <p className="quiet">
          Сотрудники жалуются на зависания. Как получаем обращения, разделяем
          проблемы и возвращаем ответ?
        </p>
        <div className="form-grid">
          <Field name="feedbackTech" label="Канал технической поддержки" />
          <Field name="feedbackProcess" label="Канал вопросов по процессу" />
          <Field
            name="feedbackOwner"
            label="Ответственный за обработку и журнал решений"
          />
          <Field
            name="feedbackStatus"
            label="Как сообщаем статус исправлений?"
          />
        </div>
        <Field
          name="feedbackAdjust"
          label="Когда корректируем план по обратной связи?"
          multiline
        />
      </details>
    </>
  );
}
function Metrics() {
  const f = useForm();
  return (
    <>
      <Block
        number="01"
        title="Выберите две метрики принятия"
        description="Какие показатели покажут, что сотрудники начали работать по-новому?"
      >
        <Multi name="metrics" options={c.metricOptions} max={2} />
        <p className="quiet">
          Выбрано {list(f.answers, "metrics").length} из 2. Снимите отметку,
          чтобы изменить выбор.
        </p>
      </Block>
      <Block
        number="02"
        title="Сделайте результат измеримым"
        description="Для каждой выбранной метрики задайте цель, срок и источник. Числа в примере — только учебные ориентиры."
      >
        {list(f.answers, "metrics").length === 0 ? (
          <p className="empty-state">Сначала выберите две метрики выше.</p>
        ) : (
          list(f.answers, "metrics").map((id) => (
            <div className="metric-card" key={id}>
              <h3>{c.metricOptions.find((m) => m[0] === id)?.[1]}</h3>
              <div className="form-grid">
                <Field
                  name={`metric.${id}.target`}
                  label="Целевое значение"
                  placeholder={
                    id === "active"
                      ? "Например, 85% (учебный пример)"
                      : "Например, 90% (учебный пример)"
                  }
                />
                <Field
                  name={`metric.${id}.when`}
                  label="Срок измерения"
                  placeholder="Через 2 месяца после масштабирования"
                />
                <Field
                  name={`metric.${id}.source`}
                  label="Источник данных"
                  placeholder="Аналитика использования, аудит коммуникаций…"
                />
              </div>
            </div>
          ))
        )}
      </Block>
      <Notice>
        Сбои, задержки доставки и обращения в поддержку остаются показателями
        риска и готовности. Они не заменяют две метрики принятия изменения.
      </Notice>
    </>
  );
}
export function Plan({
  teamId,
  onExport,
}: {
  teamId: string;
  onExport?: (format: "md" | "json") => void;
}) {
  const f = useForm(),
    plan = buildPlan(f.answers);
  return (
    <div className="plan">
      <div className="plan-banner">
        <span className="plan-icon">
          <FileText size={28} />
        </span>
        <div>
          <span className="eyebrow">РЕЗУЛЬТАТ КОМАНДЫ</span>
          <h2>План, который вы создали вместе</h2>
          <p>
            {plan.filter((s) => s.complete).length} из 20 разделов заполнено.
            Остальное — вопросы для доработки с ЦЭИ.
          </p>
        </div>
      </div>
      <div className="export-actions">
        {onExport ? (
          <button className="btn primary" onClick={() => onExport("md")}>
            <Download size={17} /> Скачать Markdown
          </button>
        ) : (
          <a className="btn primary" href={`/api/teams/${teamId}/export`}>
            <Download size={17} /> Скачать Markdown
          </a>
        )}
        <button className="btn secondary" onClick={() => window.print()}>
          <Printer size={17} /> Печать / PDF
        </button>
        {onExport ? (
          <button className="btn ghost" onClick={() => onExport("json")}>
            Ответы в JSON
          </button>
        ) : (
          <a
            className="btn ghost"
            href={`/api/teams/${teamId}/export?format=json`}
          >
            Ответы в JSON
          </a>
        )}
      </div>
      <Notice>
        Это ваши фактические решения, а не идеальный шаблон. Заполненный раздел
        может требовать методологической доработки: проверьте объяснения в
        заданиях.
      </Notice>
      {plan.map((s, i) => (
        <section className="plan-section" key={s.title}>
          <div>
            <span className="criterion-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2>{s.title}</h2>
            <span className={"badge " + (s.complete ? "green" : "amber")}>
              {s.complete ? "Заполнено" : "Требует уточнения"}
            </span>
          </div>
          <p>{s.body}</p>
        </section>
      ))}
    </div>
  );
}
export default function Stage({
  stage,
  teamId,
  event,
  onExport,
}: {
  stage: number;
  teamId: string;
  event: boolean;
  onExport?: (format: "md" | "json") => void;
}) {
  switch (stage) {
    case 0:
      return <Intro />;
    case 1:
      return <Essence />;
    case 2:
      return <Checklist />;
    case 3:
      return <Route />;
    case 4:
      return <Roles />;
    case 5:
      return <Stakeholders event={event} />;
    case 6:
      return <Communications />;
    case 7:
      return <Metrics />;
    default:
      return <Plan teamId={teamId} onExport={onExport} />;
  }
}
