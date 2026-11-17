import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Play,
  Radio,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { Answer, Snapshot } from "../shared/types";
import { stages, roleLabels } from "../shared/content";
import { evaluateStage } from "../shared/model";
import { Form, Notice } from "./components";
import Stage from "./Stages";
import { api, ApiError } from "./api";
import { Brand, Timer, finished } from "./room-ui";
import Welcome from "./Welcome";
import Dashboard from "./HostDashboard";
import Rail from "./TeamRail";
import { ProductHeader, ProductFooter } from "./ProductFrame";
interface Draft {
  value: Answer;
  version: number;
  error?: string;
}
export default function App() {
  const [s, setS] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [bootError, setBootError] = useState(""),
    [online, setOnline] = useState(false),
    [selectedTeam, setSelectedTeam] = useState<string | null>(null),
    [view, setView] = useState<number | null>(null),
    [toast, setToast] = useState(""),
    [saving, setSaving] = useState(0),
    [draftState, setDraftState] = useState<Record<string, Draft>>({});
  const invite = useRef(
    new URLSearchParams(location.hash.slice(1)).get("invite") ?? "",
  ).current;
  const snapshot = useRef(s);
  const drafts = useRef<Record<string, Draft>>({});
  const locks = useRef(new Map<string, Promise<boolean>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const update = useCallback((next: Snapshot) => {
    if (!snapshot.current || next.sequence >= snapshot.current.sequence) {
      snapshot.current = next;
      setS(next);
    }
  }, []);
  useEffect(() => {
    if (invite) {
      setLoading(false);
      return;
    }
    let active = true;
    api("/state")
      .then((next) => {
        if (active) update(next);
      })
      .catch((e) => {
        if (active && e.status !== 401) setBootError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invite, update]);
  useEffect(() => {
    const onHashChange = () => {
      if (new URLSearchParams(location.hash.slice(1)).has("invite"))
        location.reload();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const roomId = s?.room.id;
  useEffect(() => {
    if (!roomId) return;
    const source = new EventSource("/api/events");
    source.addEventListener("state", (e) => {
      update(JSON.parse(e.data));
      setOnline(true);
    });
    source.addEventListener("revoked", () => {
      source.close();
      setOnline(false);
      setToast(
        "Сеанс завершён. Войдите заново по приглашению. Несохранённый текст остаётся в этой вкладке.",
      );
    });
    source.onerror = () => setOnline(false);
    return () => {
      source.close();
      setOnline(false);
    };
  }, [roomId, update]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.keys(drafts.current).length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  const team = s?.room.teams.find(
    (t) => t.id === (s.me.role === "host" ? selectedTeam : s.me.teamId),
  );
  const teamRef = useRef(team);
  teamRef.current = team;
  const syncDrafts = () => setDraftState({ ...drafts.current });
  const commit = async (key: string): Promise<boolean> => {
    const waiting = locks.current.get(key);
    if (waiting) {
      const ok = await waiting;
      if (!ok) return false;
      return drafts.current[key] ? commit(key) : true;
    }
    const draft = drafts.current[key],
      currentTeam = teamRef.current;
    if (!draft || !currentTeam) return true;
    const timer = timers.current.get(key);
    if (timer) clearTimeout(timer);
    const sent = { ...draft };
    setSaving((n) => n + 1);
    const operation = (async () => {
      try {
        const next: Snapshot = await api(
          `/teams/${currentTeam.id}/answers`,
          { key, value: sent.value, version: sent.version },
          "PATCH",
        );
        update(next);
        if (
          JSON.stringify(drafts.current[key]?.value) ===
          JSON.stringify(sent.value)
        )
          delete drafts.current[key];
        else if (drafts.current[key])
          drafts.current[key] = {
            ...drafts.current[key],
            version: next.room.teams.find((t) => t.id === currentTeam.id)!
              .versions[key],
          };
        syncDrafts();
        return true;
      } catch (e) {
        const err = e as ApiError;
        if (err.snapshot) update(err.snapshot);
        if (drafts.current[key]) drafts.current[key].error = err.message;
        syncDrafts();
        return false;
      } finally {
        setSaving((n) => n - 1);
        locks.current.delete(key);
      }
    })();
    locks.current.set(key, operation);
    return operation;
  };
  const change = (key: string, value: Answer, immediate = false) => {
    const t = teamRef.current;
    if (!t) return;
    drafts.current[key] = {
      value,
      version: drafts.current[key]?.version ?? t.versions[key] ?? 0,
    };
    syncDrafts();
    const old = timers.current.get(key);
    if (old) clearTimeout(old);
    if (immediate) void commit(key);
    else
      timers.current.set(
        key,
        setTimeout(() => void commit(key), 700),
      );
  };
  const flush = async () => {
    for (const key of Object.keys(drafts.current)) {
      if (!(await commit(key))) return false;
    }
    return true;
  };
  const editable =
    !!s &&
    (s.me.role === "captain" || (s.me.role === "participant" && s.me.canEdit));
  const navigate = async (step: number) => {
    if (!(await flush())) {
      setToast("Сначала сохраните или отклоните несохранённые ответы.");
      return;
    }
    if (editable && team) {
      try {
        update(await api(`/teams/${team.id}/step`, { step }, "PATCH"));
        setView(null);
      } catch (e) {
        setToast((e as Error).message);
      }
    } else setView(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const action = async (a: string) => {
    try {
      update(await api("/timer", { action: a }));
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  async function logout() {
    if (!(await flush())) return;
    try {
      await api("/logout", {});
      snapshot.current = null;
      setS(null);
      setView(null);
      setSelectedTeam(null);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <Brand />
        <span>Открываем пространство команды…</span>
      </div>
    );
  if (!s)
    return (
      <>
        {bootError && (
          <div className="boot-error" role="alert">
            {bootError}
            <button onClick={() => location.reload()}>
              Повторить подключение
            </button>
          </div>
        )}
        <Welcome
          invite={invite}
          onEnter={(next) => {
            update(next);
            setBootError("");
          }}
        />
      </>
    );
  const stage = view ?? team?.step ?? 0,
    progress = team ? finished(team) : 0;
  const answers = {
    ...team?.answers,
    ...Object.fromEntries(
      Object.entries(draftState).map(([k, d]) => [k, d.value]),
    ),
  };
  const evaluation = team ? evaluateStage(stage, answers) : null;
  const checked = team?.checked.includes(stage);
  const errors = Object.entries(draftState).filter(([, d]) => d.error);
  return (
    <div className="shell">
      <ProductHeader
        activePlan={!!team && stage === 8}
        gameLabel={s.me.role === "host" ? "Команды" : "Игра"}
        canHelp={!!team}
        onGame={() => {
          if (s.me.role === "host") {
            setSelectedTeam(null);
            setView(null);
          } else void navigate(0);
        }}
        onPlan={team ? () => void navigate(8) : undefined}
      />
      <div className="shell-body">
        <aside className="sidebar">
          <div className="sidebar-label">ВАШ ВОРКШОП</div>
          <div className="sidebar-case">
            <span className="case-symbol">
              <MessageCircle size={20} />
            </span>
            <strong>
              Один мессенджер —<br />
              одна компания
            </strong>
          </div>
          {s.me.role === "host" && (
            <button
              className={"nav-host " + (!team ? "active" : "")}
              onClick={() => {
                setSelectedTeam(null);
                setView(null);
              }}
            >
              <LayoutDashboard size={18} />
              Обзор команд
            </button>
          )}
          {team ? (
            <>
              <div className="team-switch">
                <span className="online-dot" />
                {team.name}
                <span>{roleLabels[s.me.role]}</span>
              </div>
              <nav aria-label="Задания воркшопа">
                {stages.map((st, i) => {
                  const complete =
                    i < 8 && evaluateStage(i, team.answers).complete;
                  return (
                    <button
                      className={
                        "nav-item " +
                        (stage === i ? "active" : "") +
                        (complete ? " complete" : "")
                      }
                      key={st.short}
                      aria-label={
                        i === 0
                          ? "Вводная"
                          : i === 8
                            ? "Итоговый план"
                            : `${i} ${st.short}`
                      }
                      onClick={() => void navigate(i)}
                    >
                      <span className="nav-index">
                        {complete ? (
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
                <p>Каждый шаг — часть вашего плана</p>
              </div>
            </>
          ) : (
            <div className="sidebar-host-note">
              <Sparkles size={22} />
              <h3>Меняем привычки вместе</h3>
              <p>
                Помогайте командам искать свои решения. Здесь нет рейтинга или
                гонки на скорость.
              </p>
            </div>
          )}
          <div className="sidebar-bottom">
            <span className="avatar small-avatar">{s.me.name[0]}</span>
            <div>
              <strong>{s.me.name}</strong>
              <small>{roleLabels[s.me.role]}</small>
            </div>
            <button
              className="icon-btn"
              onClick={() => void logout()}
              aria-label="Выйти"
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <span>Воркшоп</span>
              <ChevronRight size={14} />
              <strong>{team ? team.name : "Пульт ведущего"}</strong>
            </div>
            <div className="topbar-right">
              <span className={"connection " + (online ? "" : "offline")}>
                {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>
                  {online ? "Синхронизация включена" : "Восстанавливаем связь"}
                </span>
              </span>
              <Timer s={s} />
            </div>
          </header>
          {toast && (
            <div className="toast" role="alert">
              {toast}
              <button
                aria-label="Закрыть уведомление"
                onClick={() => setToast("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {s.room.event && team && stage !== 5 && (
            <div className="event-global">
              <Sparkles size={17} />
              <span>
                Событие: сбои продолжаются, только 45% участников используют
                мессенджер. Проверьте план Б.
              </span>
              <button onClick={() => void navigate(5)}>Обсудить</button>
            </div>
          )}
          {errors.length > 0 && (
            <section className="unsaved" role="alert">
              <h3>Есть несохранённые ответы</h3>
              {errors.map(([key, d]) => (
                <div key={key}>
                  <p>{d.error}</p>
                  <p>
                    <b>Ваш вариант:</b>{" "}
                    {Array.isArray(d.value) ? d.value.join(", ") : d.value}
                  </p>
                  <p>
                    <b>На сервере:</b>{" "}
                    {String(team?.answers[key] ?? "Не заполнено")}
                  </p>
                  <button
                    className="btn secondary small"
                    onClick={() => {
                      drafts.current[key].version = team?.versions[key] ?? 0;
                      delete drafts.current[key].error;
                      syncDrafts();
                      void commit(key);
                    }}
                  >
                    Сохранить мой вариант
                  </button>
                  <button
                    className="btn ghost small"
                    onClick={() => {
                      delete drafts.current[key];
                      syncDrafts();
                    }}
                  >
                    Принять ответ команды
                  </button>
                </div>
              ))}
            </section>
          )}
          {!team ? (
            <Dashboard
              s={s}
              onTeam={(id) => {
                setSelectedTeam(id);
                setView(null);
              }}
              onAction={(a) => void action(a)}
            />
          ) : (
            <>
              <div className="team-page">
                <main className="stage-main">
                  <div className="page-heading">
                    <div className="heading-meta">
                      <span className="eyebrow">
                        {stage === 0
                          ? "ПЕРЕД СТАРТОМ"
                          : stage === 8
                            ? "ОТ ОБСУЖДЕНИЯ — К ДЕЙСТВИЮ"
                            : `ЗАДАНИЕ ${String(stage).padStart(2, "0")} ИЗ 07`}
                      </span>
                      <span className="time-badge">
                        <Clock size={13} />
                        {stages[stage].minutes} мин
                      </span>
                    </div>
                    <h1 tabIndex={-1}>{stages[stage].title}</h1>
                    <p>{stages[stage].description}</p>
                  </div>
                  <div className="save-bar">
                    <span
                      className={
                        "save-status " + (errors.length ? "save-error" : "")
                      }
                    >
                      {saving ? (
                        <Radio size={14} />
                      ) : Object.keys(draftState).length ? (
                        <Clock size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}{" "}
                      {saving
                        ? "Сохраняем на сервере…"
                        : errors.length
                          ? "Не сохранено"
                          : Object.keys(draftState).length
                            ? "Есть несохранённый текст"
                            : "Ответы сохранены на сервере"}
                    </span>
                    <span>
                      {editable
                        ? "Вы фиксируете решения команды"
                        : "Ответы фиксирует капитан"}
                    </span>
                  </div>
                  {s.room.status === "finished" && (
                    <Notice>
                      Время раунда закончилось. Ответы сохранены; можно
                      продолжить доработку плана.
                    </Notice>
                  )}
                  <Form.Provider
                    value={{
                      answers,
                      editable,
                      checked: !!checked,
                      set: change,
                      commit: (key) => void commit(key),
                    }}
                  >
                    <Stage
                      key={stage}
                      stage={stage}
                      teamId={team.id}
                      event={s.room.event}
                    />
                  </Form.Provider>
                  {checked && stage < 8 && evaluation && (
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
                      {evaluation.complete ? (
                        <>
                          <h3>
                            <CheckCircle2 size={20} />
                            Правила соблюдены
                          </h3>
                          <p>
                            {stage === 2
                              ? "Переход является масштабным изменением. Используем фреймворк."
                              : stage === 3
                                ? "Маршрут и меры зафиксированы. Пилот рекомендуется при неопределённости; аргументированные альтернативы допустимы."
                                : stage === 4
                                  ? "Чемпион — человек, которому доверяют коллеги и который готов помогать."
                                  : stage === 7
                                    ? "Измеряем реальное использование и изменение привычного способа работы."
                                    : "Решение зафиксировано. Вы можете вернуться и дополнить его."}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3>
                            {evaluation.issues.length
                              ? "Есть что пересмотреть"
                              : "Добавьте недостающие детали"}
                          </h3>
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
                      onClick={() => void navigate(stage - 1)}
                    >
                      <ArrowLeft size={16} />
                      Назад
                    </button>
                    <div>
                      {editable && stage < 8 && (
                        <button
                          className="btn secondary"
                          onClick={async () => {
                            if (!(await flush())) return;
                            try {
                              const result = await api<{ snapshot: Snapshot }>(
                                `/teams/${team.id}/check`,
                                { stage },
                              );
                              update(result.snapshot);
                            } catch (e) {
                              setToast((e as Error).message);
                            }
                          }}
                        >
                          Проверить решение
                        </button>
                      )}
                      {stage < 8 && (
                        <button
                          className="btn primary"
                          onClick={() => void navigate(stage + 1)}
                        >
                          {stage === 7
                            ? "Собрать итоговый план"
                            : "Следующее задание"}
                          <ArrowRight size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="stage-footnote">
                    Сначала обсудите — затем зафиксируйте. К любому решению
                    можно вернуться.
                  </p>
                </main>
                <Rail s={s} team={team} stage={stage} onUpdate={update} />
              </div>
            </>
          )}
        </div>
      </div>
      <ProductFooter />
    </div>
  );
}
