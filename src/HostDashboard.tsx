import { useState } from "react";
import {
  Check,
  Copy,
  Users,
  Play,
  Pause,
  Flag,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Radio,
} from "lucide-react";
import type { Snapshot } from "../shared/types";
import { stages, roleLabels } from "../shared/content";
import { Notice } from "./components";
import { finished } from "./room-ui";
function Invitations({ s }: { s: Snapshot }) {
  const [copied, setCopied] = useState("");
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/#invite=${token}`,
      );
      setCopied(token);
    } catch {
      setCopied("manual");
    }
  };
  return (
    <section className="invitations">
      <Notice type="warning">
        Приглашения дают доступ к роли. Передавайте ссылку капитана только
        капитану, а ссылку ведущего храните отдельно. Ссылки участников
        выдавайте своей команде.
      </Notice>
      {[...s.room.teams, { id: null, name: "Доступ ведущего" }].map((t) => (
        <div className="invite-team" key={t.id ?? "host"}>
          <h3>{t.name}</h3>
          {s.invites
            ?.filter((i) => i.teamId === t.id)
            .map((i) => (
              <div className="invite-row" key={i.token}>
                <label className="field">
                  <span>{roleLabels[i.role]}</span>
                  <input
                    readOnly
                    aria-label={`Приглашение: ${t.name}, ${roleLabels[i.role]}`}
                    value={`${location.origin}/#invite=${i.token}`}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button
                  className="btn secondary small"
                  aria-label={`Скопировать: ${t.name}, ${roleLabels[i.role]}`}
                  onClick={() => copy(i.token)}
                >
                  {copied === i.token ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            ))}
        </div>
      ))}
      {copied === "manual" && (
        <p role="status">Выделите ссылку в поле и скопируйте вручную.</p>
      )}
    </section>
  );
}
export default function Dashboard({
  s,
  onTeam,
  onAction,
}: {
  s: Snapshot;
  onTeam: (id: string) => void;
  onAction: (a: string) => void;
}) {
  const [invites, setInvites] = useState(false);
  return (
    <div className="dashboard">
      <div className="page-heading">
        <span className="eyebrow">ПУЛЬТ ВЕДУЩЕГО</span>
        <h1>Команды готовы к переменам</h1>
        <p>Один кейс. Разные решения. Общий путь к новому способу работать.</p>
      </div>
      <div className="host-control">
        <div>
          <span className="host-control-icon">
            <Radio size={24} />
          </span>
          <div>
            <h2>Управляйте общим раундом</h2>
            <p>30 минут на вводную, семь заданий и финальный план.</p>
          </div>
        </div>
        <div className="host-buttons">
          {s.room.status === "waiting" && (
            <button className="btn primary" onClick={() => onAction("start")}>
              <Play size={16} />
              Начать 30 минут
            </button>
          )}
          {s.room.status === "running" && (
            <button className="btn secondary" onClick={() => onAction("pause")}>
              <Pause size={16} />
              Пауза
            </button>
          )}
          {s.room.status === "paused" && (
            <button className="btn primary" onClick={() => onAction("resume")}>
              <Play size={16} />
              Продолжить
            </button>
          )}
          {["running", "paused"].includes(s.room.status) && (
            <button
              className="btn secondary"
              onClick={() => onAction("finish")}
            >
              <Flag size={16} />
              Завершить раунд
            </button>
          )}
          <button
            className="btn secondary"
            onClick={() => setInvites(!invites)}
          >
            <Users size={16} />
            {invites ? "Скрыть приглашения" : "Пригласить участников"}
          </button>
        </div>
      </div>
      {s.room.status === "finished" && (
        <Notice type="success">
          Раунд завершён. Планы сохранены. Команды могут доработать решения и
          экспортировать результат.
        </Notice>
      )}
      {invites && <Invitations s={s} />}
      <div className="dashboard-section-heading">
        <h2>Рабочие пространства команд</h2>
        <span className="badge">
          {s.members.length} участников подключилось
        </span>
      </div>
      <div className="team-grid">
        {s.room.teams.map((t, i) => {
          const progress = finished(t),
            members = s.members.filter((m) => m.teamId === t.id);
          return (
            <button
              key={t.id}
              className="team-card"
              onClick={() => onTeam(t.id)}
            >
              <div className="team-card-top">
                <span className={"team-emblem team-" + i}>
                  <Users size={26} />
                </span>
                <span className="badge">{members.length} участников</span>
              </div>
              <h2>{t.name}</h2>
              <p>{stages[t.step].short}</p>
              <div className="progress-track">
                <span style={{ width: `${(progress / 7) * 100}%` }} />
              </div>
              <div className="team-card-bottom">
                <span>{progress}/7 заданий готово</span>
                <ArrowRight size={19} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="dashboard-bottom">
        <div className="event-teaser">
          <span className="eyebrow">ДОПОЛНИТЕЛЬНАЯ МЕХАНИКА</span>
          <h2>А если всё пойдёт не по плану?</h2>
          <p>
            Выдайте командам событие: только 45% участников пилота пользуются
            мессенджером, а сбои продолжаются. Пусть проверят свой план Б.
          </p>
          <button
            className="btn secondary"
            disabled={s.room.event}
            onClick={() => onAction("event")}
          >
            <Sparkles size={17} />
            {s.room.event ? "Событие отправлено командам" : "Отправить событие"}
          </button>
        </div>
        <div className="facilitator-note">
          <HelpCircle size={24} />
          <h3>Помогайте думать, а не угадывать</h3>
          <p>
            Не оценивайте команды по скорости. У разных маршрутов могут быть
            обоснованные причины. Главное — люди, риски и реальное принятие
            изменения.
          </p>
        </div>
      </div>
    </div>
  );
}
