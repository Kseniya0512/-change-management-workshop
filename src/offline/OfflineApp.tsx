import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Flag,
  HelpCircle,
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Form, Notice } from "../components";
import { finished } from "../room-ui";
import Stage from "../Stages";
import { ProductHeader, ProductFooter } from "../ProductFrame";
import { stages, ceiSteps, phases, hints } from "../../shared/content";
import { evaluateStage, planMarkdown } from "../../shared/model";
import type { Answer } from "../../shared/types";
import {
  createOffline,
  loadOffline,
  saveOffline,
  parseOffline,
  remaining,
  changeTimer,
  type OfflineState,
} from "./store";
function initial() {
  try {
    return loadOffline(window.localStorage);
  } catch {
    return {
      state: createOffline(),
      warning:
        "Хранилище браузера недоступно. Скачивайте резервные копии ответов.",
    };
  }
}
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function OfflineApp() {
  const [{ state: loaded, warning: initialWarning }] = useState(initial);
  const [state, setState] = useState(loaded),
    [warning, setWarning] = useState(initialWarning),
    [message, setMessage] = useState(""),
    [now, setNow] = useState(Date.now()),
    [pendingImport, setPendingImport] = useState<OfflineState | null>(null),
    [reset, setReset] = useState(false);
  const current = useRef(state);
  current.current = state;
  function update(next: OfflineState) {
    current.current = next;
    setState(next);
    try {
      setWarning(saveOffline(next, window.localStorage));
    } catch {
      setWarning(
        "Не удалось сохранить ответы в браузере. Скачайте резервную копию.",
      );
    }
  }
  useEffect(() => {
    const id = setInterval(() => {
      const time = Date.now();
      setNow(time);
      const s = current.current;
      if (s.status === "running" && remaining(s, time) === 0)
        update({ ...s, status: "finished", remainingMs: 0, endsAt: null });
    }, 500);
    return () => clearInterval(id);
  }, []);
  const team = state.teams.find((t) => t.id === state.currentTeamId)!,
    stage = team.step,
    progress = finished(team),
    evaluation = evaluateStage(stage, team.answers),
    checked = team.checked.includes(stage);
  const editTeam = (change: Partial<typeof team>) =>
    update({
      ...current.current,
      teams: current.current.teams.map((t) =>
        t.id === team.id ? { ...t, ...change } : t,
      ),
    });
  const change = (key: string, value: Answer) => {
    const active = current.current.teams.find((t) => t.id === team.id)!;
    editTeam({ answers: { ...active.answers, [key]: value } });
  };
  const navigate = (step: number) => {
    editTeam({ step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const seconds = Math.ceil(remaining(state, now) / 1000),
    clock = `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const status = {
    waiting: "До старта",
    running: "Раунд идёт",
    paused: "На паузе",
    finished: "Раунд завершён",
  }[state.status];
  const exportPlan = (format: "md" | "json") =>
    download(
      format === "md"
        ? planMarkdown(team.answers, team.name)
        : JSON.stringify(
            {
              team: team.name,
              answers: team.answers,
              exportedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
      `messenger-plan.${format}`,
      format === "md" ? "text/markdown;charset=utf-8" : "application/json",
    );
  const backup = () =>
    download(
      JSON.stringify(current.current, null, 2),
      "workshop-backup.json",
      "application/json",
    );
  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error();
      setPendingImport(parseOffline(await file.text()));
      setMessage("");
    } catch {
      setMessage(
        "Не удалось открыть копию. Выберите файл workshop-backup.json из этой игры (не больше 2 МБ). Текущие ответы сохранены.",
      );
    }
  }
  return (
    <div className="shell offline-shell">
      <ProductHeader
        local
        activePlan={stage === 8}
        onGame={() => navigate(0)}
        onPlan={() => navigate(8)}
      />
      <div className="shell-body">
        <aside className="sidebar">
          <div className="sidebar-label">ИГРА БЕЗ ПОДКЛЮЧЕНИЙ</div>
          <div className="sidebar-case">
            <span className="case-symbol">
              <MessageCircle size={20} />
            </span>
            <strong>
              Один мессенджер —<br />
              одна компания
            </strong>
          </div>
          <div className="offline-team-picker">
            <label className="field">
              <span>Рабочий лист команды</span>
              <select
                aria-label="Рабочий лист команды"
                value={team.id}
                onChange={(e) => {
                  update({ ...current.current, currentTeamId: e.target.value });
                  setMessage("");
                }}
              >
                {state.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <nav aria-label="Задания воркшопа">
            {stages.map((st, i) => {
              const done = i < 8 && evaluateStage(i, team.answers).complete;
              return (
                <button
                  key={i}
                  className={
                    "nav-item " +
                    (stage === i ? "active" : "") +
                    (done ? " complete" : "")
                  }
                  aria-label={
                    i === 0
                      ? "Вводная"
                      : i === 8
                        ? "Итоговый план"
                        : `${i} ${st.short}`
                  }
                  onClick={() => navigate(i)}
                >
                  <span className="nav-index">
                    {done ? (
                      <Check size={13} />
                    ) : i === 0 ? (
                      <Play size={12} />
                    ) : i === 8 ? (
                      <Flag size={13} />
                    ) : (
                      i
                    )}
                  </span>
                  <span>{st.short}</span>
                  {stage === i && <ChevronRight size={15} />}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-progress">
            <div>
              <span>Ваш прогресс</span>
              <strong>{progress}/7</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(progress / 7) * 100}%` }} />
            </div>
            <p>Свой план для каждой команды</p>
          </div>
          <div className="offline-sidebar-footer">
            <ShieldCheck size={18} />
            <span>
              Без регистрации.
              <br />
              Без внешних подключений.
            </span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <span>Автономная игра</span>
              <ChevronRight size={14} />
              <strong>{team.name}</strong>
            </div>
            <div className="timer">
              <Clock size={18} />
              <strong aria-label="Оставшееся время">{clock}</strong>
              <span>{status}</span>
            </div>
          </header>
          <div className="offline-toolbar">
            <div className="offline-timer-buttons">
              {state.status === "waiting" && (
                <button
                  className="btn primary small"
                  onClick={() => update(changeTimer(current.current, "start"))}
                >
                  <Play size={14} />
                  Начать 30 минут
                </button>
              )}
              {state.status === "running" && (
                <button
                  className="btn secondary small"
                  onClick={() => update(changeTimer(current.current, "pause"))}
                >
                  <Pause size={14} />
                  Пауза
                </button>
              )}
              {state.status === "paused" && (
                <button
                  className="btn primary small"
                  onClick={() => update(changeTimer(current.current, "resume"))}
                >
                  <Play size={14} />
                  Продолжить
                </button>
              )}
              {["running", "paused"].includes(state.status) && (
                <button
                  className="btn ghost small"
                  onClick={() => update(changeTimer(current.current, "finish"))}
                >
                  <Flag size={14} />
                  Завершить раунд
                </button>
              )}
            </div>
            <div className="offline-file-buttons">
              <button className="btn secondary small" onClick={backup}>
                <Download size={14} />
                Сохранить резервную копию
              </button>
              <label className="btn secondary small">
                <Upload size={14} />
                Загрузить копию
                <input
                  className="sr-only"
                  aria-label="Загрузить резервную копию"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    void importBackup(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          {warning && (
            <div className="offline-warning" role="alert">
              {warning}
              <button className="btn secondary small" onClick={backup}>
                Скачать копию
              </button>
            </div>
          )}
          {message && (
            <div className="offline-message" role="status">
              {message}
              <button
                className="icon-btn"
                aria-label="Закрыть сообщение"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}
          <div className="team-page">
            <main className="stage-main">
              <div className="page-heading">
                <div className="heading-meta">
                  <span className="eyebrow">
                    {stage === 0
                      ? "ОТКРОЙТЕ И НАЧНИТЕ ИГРУ"
                      : stage === 8
                        ? "ВАШ РЕЗУЛЬТАТ"
                        : `ЗАДАНИЕ ${String(stage).padStart(2, "0")} ИЗ 07`}
                  </span>
                  <span className="time-badge">
                    <Clock size={13} />
                    {stages[stage].minutes} мин
                  </span>
                </div>
                <h1>{stages[stage].title}</h1>
                <p>{stages[stage].description}</p>
              </div>
              <div className="save-bar">
                <span className="save-status">
                  <Check size={14} />
                  {warning
                    ? "Сохранение требует внимания"
                    : "Ответы хранятся в этом браузере"}
                </span>
                <span>Без сервера и регистрации</span>
              </div>
              {stage === 0 && (
                <Notice>
                  Проходите самостоятельно или обсуждайте задания командой на
                  одном экране. Три рабочих листа сохраняются отдельно. На
                  других устройствах ответы автоматически не появляются.
                </Notice>
              )}
              {state.status === "finished" && (
                <Notice>
                  Раунд завершён. Можно вернуться к любому решению и доработать
                  план.
                </Notice>
              )}
              <Form.Provider
                value={{
                  answers: team.answers,
                  editable: true,
                  checked,
                  set: change,
                  commit: () => {},
                }}
              >
                <Stage
                  key={team.id + "-" + stage}
                  stage={stage}
                  teamId={team.id}
                  event={false}
                  onExport={exportPlan}
                />
              </Form.Provider>
              {checked && stage < 8 && (
                <section
                  className={
                    "validation " +
                    (evaluation.complete
                      ? "success"
                      : evaluation.issues.length
                        ? "error"
                        : "warning")
                  }
                  aria-live="polite"
                >
                  <h3>
                    {evaluation.complete
                      ? "Правила соблюдены"
                      : evaluation.issues.length
                        ? "Есть что пересмотреть"
                        : "Добавьте недостающие детали"}
                  </h3>
                  {evaluation.complete ? (
                    <p>
                      {stage === 2
                        ? "Два и более «да» из восьми: применяем фреймворк."
                        : stage === 7
                          ? "Измеряем фактическое использование и изменение рабочего поведения."
                          : "Решение проверено. Вы можете вернуться и доработать план."}
                    </p>
                  ) : (
                    <>
                      {evaluation.issues.map((issue, i) => (
                        <p key={i}>{issue}</p>
                      ))}
                      {evaluation.needs.length > 0 && (
                        <details>
                          <summary>
                            Требует уточнения: {evaluation.needs.length}
                          </summary>
                          <ul>
                            {evaluation.needs.map((need, i) => (
                              <li key={i}>{need}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </section>
              )}
              <div className="stage-footer">
                <button
                  className="btn ghost"
                  disabled={stage === 0}
                  onClick={() => navigate(stage - 1)}
                >
                  <ArrowLeft size={16} />
                  Назад
                </button>
                <div>
                  {stage < 8 && (
                    <button
                      className="btn secondary"
                      onClick={() => {
                        if (!checked)
                          editTeam({ checked: [...team.checked, stage] });
                      }}
                    >
                      Проверить решение
                    </button>
                  )}
                  {stage < 8 && (
                    <button
                      className="btn primary"
                      onClick={() => navigate(stage + 1)}
                    >
                      {stage === 7
                        ? "Собрать итоговый план"
                        : "Следующее задание"}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className="stage-footnote">
                Обсуждайте, пробуйте, исправляйте. Штрафов и рейтинга нет.
              </p>
            </main>
            <aside className="rail">
              <section className="help-card" id="cei-help" tabIndex={-1}>
                <div className="rail-title">
                  <span className="help-icon">
                    <Sparkles size={18} />
                  </span>
                  <h2>На связи ЦЭИ</h2>
                  <span className="badge">Без штрафов</span>
                </div>
                <details className="context-hint">
                  <summary>Нужна подсказка?</summary>
                  <p>{hints[stage]}</p>
                </details>
                <details>
                  <summary>Пять шагов процесса</summary>
                  <ol>
                    {ceiSteps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </details>
                <details>
                  <summary>Четыре этапа внедрения</summary>
                  <ol>
                    {phases.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </details>
              </section>
              <section>
                <div className="rail-title">
                  <FileText size={18} />
                  <h2>Ваш рабочий лист</h2>
                </div>
                <label className="field">
                  <span>Название команды</span>
                  <input
                    value={team.name}
                    maxLength={60}
                    onChange={(e) =>
                      editTeam({
                        name: e.target.value.trim()
                          ? e.target.value
                          : "Команда",
                      })
                    }
                  />
                </label>
                <p className="quiet">
                  Один браузер — одно локальное сохранение. Резервная копия
                  переносит все листы на другой компьютер.
                </p>
                <button
                  className="btn ghost small full"
                  onClick={() => setReset(true)}
                >
                  Начать новую игру
                </button>
              </section>
              <section className="offline-info-card">
                <HelpCircle size={20} />
                <h3>Можно просто пройтись по игре</h3>
                <p>
                  Ответы сохраняются после каждого действия. Итоговый план
                  доступен в любой момент. Если браузер ограничил сохранение,
                  скачайте копию ответов.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </div>
      <ProductFooter local />
      {(pendingImport || reset) && (
        <div className="offline-modal-backdrop">
          <section
            className="offline-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">
              {pendingImport
                ? "Восстановить резервную копию?"
                : "Начать новую игру?"}
            </h2>
            <p>
              Все текущие листы команд и таймер будут заменены. Сначала можно
              сохранить ответы в файл.
            </p>
            <div>
              <button className="btn secondary" onClick={backup}>
                Скачать текущие ответы
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setPendingImport(null);
                  setReset(false);
                }}
              >
                Отмена
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  update(pendingImport ?? createOffline());
                  setMessage(
                    pendingImport
                      ? "Резервная копия восстановлена"
                      : "Новая игра готова",
                  );
                  setPendingImport(null);
                  setReset(false);
                }}
              >
                {pendingImport ? "Восстановить копию" : "Начать заново"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
