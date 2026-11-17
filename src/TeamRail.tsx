import { useState } from "react";
import { Sparkles, Users, MessageCircle, Send } from "lucide-react";
import type { Snapshot, Team } from "../shared/types";
import { roleLabels, hints, ceiSteps, phases } from "../shared/content";
import { api } from "./api";
export default function Rail({
  s,
  team,
  stage,
  onUpdate,
}: {
  s: Snapshot;
  team: Team;
  stage: number;
  onUpdate: (s: Snapshot) => void;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const members = s.members.filter((m) => m.teamId === team.id),
    comments = s.comments.filter((c) => c.teamId === team.id);
  const canGrant = s.me.role === "host" || s.me.role === "captain";
  async function comment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdate(await api(`/teams/${team.id}/comments`, { text: message }));
      setMessage("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="rail">
      <section className="help-card">
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
            {phases.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </details>
      </section>
      <section className="members-card">
        <div className="rail-title">
          <Users size={18} />
          <h2>Ваша команда</h2>
          <span>{members.length}</span>
        </div>
        {members.length ? (
          members.map((m) => (
            <div className="member" key={m.id}>
              <span className="avatar small-avatar">{m.name[0]}</span>
              <span>
                <strong>
                  {m.name}
                  {m.id === s.me.id ? " · вы" : ""}
                </strong>
                <small>
                  {roleLabels[m.role]}
                  {m.canEdit ? " · редактор" : ""}
                </small>
              </span>
              {canGrant && m.role === "participant" && (
                <button
                  className="grant-btn"
                  onClick={async () => {
                    try {
                      onUpdate(
                        await api(
                          `/members/${m.id}`,
                          { canEdit: !m.canEdit },
                          "PATCH",
                        ),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {m.canEdit ? "Отозвать" : "Дать запись"}
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="quiet">Поделитесь приглашениями с участниками.</p>
        )}
      </section>
      <section className="discussion-card">
        <div className="rail-title">
          <MessageCircle size={18} />
          <h2>Обсуждение</h2>
          <span>{comments.length}</span>
        </div>
        <p className="quiet">
          Заметки команды и подсказки куратора. Показаны последние 500 сообщений
          комнаты.
        </p>
        <div className="comments" aria-live="polite">
          {comments.length ? (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <div>
                  <strong>{c.author}</strong>
                  <time>
                    {new Date(c.at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <small>{roleLabels[c.role]}</small>
                <p>{c.text}</p>
              </div>
            ))
          ) : (
            <div className="empty-discussion">
              <MessageCircle size={25} />
              <p>
                Здесь начинается диалог.
                <br />
                Запишите первую мысль.
              </p>
            </div>
          )}
        </div>
        <form onSubmit={comment}>
          <label className="sr-only" htmlFor="comment">
            Сообщение команде
          </label>
          <textarea
            id="comment"
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Мысль, вопрос или подсказка…"
            rows={3}
          />
          <button
            className="btn secondary small full"
            disabled={!message.trim() || busy}
          >
            <Send size={14} />
            Отправить
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </aside>
  );
}
