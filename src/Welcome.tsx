import { useState } from "react";
import { Clock, Users, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { Snapshot } from "../shared/types";
import { Brand } from "./room-ui";
import { api } from "./api";
export default function Welcome({
  invite,
  onEnter,
}: {
  invite: string;
  onEnter: (s: Snapshot) => void;
}) {
  const [name, setName] = useState(""),
    [count, setCount] = useState(3),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [token, setToken] = useState(invite),
    [joining, setJoining] = useState(!!invite);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const state = await api(
        joining ? "/join" : "/rooms",
        joining ? { name, token } : { name, teamCount: count },
      );
      history.replaceState(null, "", location.pathname);
      onEnter(state);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="welcome">
      <header>
        <Brand />
        <span className="welcome-label">КОМАНДНЫЙ ВОРКШОП</span>
        <span className="welcome-duration">
          <Clock size={16} /> 30 минут на перемены
        </span>
      </header>
      <main className="welcome-grid">
        <div className="welcome-copy">
          <span className="pill">
            <span className="online-dot" /> УЧИМСЯ НА ПРАКТИКЕ
          </span>
          <h1>
            Один мессенджер.
            <br />
            <span>Одна компания.</span>
          </h1>
          <p className="welcome-lead">
            Из разных чатов — в единое пространство.
            <br />
            Из идеи — в план, который работает.
          </p>
          <p className="welcome-description">
            Пройдите путь внедрения вместе с командой: от первого обращения в
            ЦЭИ до метрик принятия. Учтите людей, технические риски и то, что не
            всегда идёт по плану.
          </p>
          <div className="welcome-facts">
            <div>
              <strong>07</strong>
              <span>
                практических
                <br />
                заданий
              </span>
            </div>
            <div>
              <strong>2–3</strong>
              <span>
                команды
                <br />
                единомышленников
              </span>
            </div>
            <div>
              <strong>01</strong>
              <span>
                собственный
                <br />
                план внедрения
              </span>
            </div>
          </div>
          <div className="welcome-quote">
            <span className="avatar lime">
              <Sparkles size={21} />
            </span>
            <p>
              Изменение начинается не с установки приложения.
              <br />
              <strong>Оно начинается с нового способа работать.</strong>
            </p>
          </div>
        </div>
        <section className="entry-card">
          <div className="entry-top">
            <span className="entry-icon">
              <Users size={25} />
            </span>
            <span className="badge green">Всё начинается здесь</span>
          </div>
          <h2>{joining ? "Ваша команда ждёт" : "Соберите команду перемен"}</h2>
          <p>
            {joining
              ? "Введите имя и присоединитесь к общему рабочему пространству."
              : "Создайте воркшоп и пригласите участников. Настраивать сервисы для начала игры не нужно."}
          </p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Ваше имя</span>
              <input
                autoComplete="name"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться?"
              />
            </label>
            {joining ? (
              !invite && (
                <label className="field">
                  <span>Код приглашения</span>
                  <input
                    required
                    value={token}
                    onChange={(e) => {
                      const v = e.target.value;
                      setToken(
                        v.includes("#invite=") ? v.split("#invite=")[1] : v,
                      );
                    }}
                    placeholder="Код или ссылка от ведущего"
                  />
                </label>
              )
            ) : (
              <fieldset className="team-count">
                <legend>Количество команд</legend>
                {[2, 3].map((n) => (
                  <label key={n} className={count === n ? "active" : ""}>
                    <input
                      type="radio"
                      name="teams"
                      checked={count === n}
                      onChange={() => setCount(n)}
                    />
                    <Users size={18} />
                    {n} команды{n === 3 && <span>для 20 участников</span>}
                  </label>
                ))}
              </fieldset>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary full" type="submit" disabled={busy}>
              {busy
                ? "Подключаемся…"
                : joining
                  ? "Присоединиться"
                  : "Создать воркшоп"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="entry-switch">
            {joining ? "Организуете встречу?" : "Уже получили приглашение?"}{" "}
            <button
              onClick={() => {
                setJoining(!joining);
                setError("");
              }}
            >
              {joining ? "Создать воркшоп" : "Войти в команду"}
            </button>
          </div>
          <div className="entry-foot">
            <ShieldCheck size={17} />
            <span>
              Ответы сохраняются на сервере.
              <br />
              Команда видит изменения в реальном времени.
            </span>
          </div>
        </section>
      </main>
      <footer>
        <span>РТК ИТ · ПРАКТИКА УПРАВЛЕНИЯ ИЗМЕНЕНИЯМИ</span>
        <span>Люди. Диалог. Новое поведение.</span>
      </footer>
    </div>
  );
}
