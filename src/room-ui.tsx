import { useEffect, useRef, useState } from "react";
import { MessageSquareText, Clock } from "lucide-react";
import type { Snapshot, Team } from "../shared/types";
import { evaluateStage } from "../shared/model";
export const finished = (team: Team) =>
  Array.from(
    { length: 7 },
    (_, i) => evaluateStage(i + 1, team.answers).complete,
  ).filter(Boolean).length;
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <MessageSquareText size={23} />
      </span>
      <div>
        <strong>РТК ИТ</strong>
        <small>ЛЮДИ И ИЗМЕНЕНИЯ</small>
      </div>
    </div>
  );
}
export function Timer({ s }: { s: Snapshot }) {
  const [now, setNow] = useState(Date.now());
  const offset = useRef(s.serverNow - Date.now());
  useEffect(() => {
    offset.current = s.serverNow - Date.now();
  }, [s.serverNow]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const remaining =
    s.room.status === "running"
      ? Math.max(0, (s.room.endsAt ?? 0) - (now + offset.current))
      : s.room.remainingMs;
  const sec = Math.ceil(remaining / 1000),
    time = `${Math.floor(sec / 60)
      .toString()
      .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
  const statuses = {
    waiting: "До старта",
    running: "Раунд идёт",
    paused: "На паузе",
    finished: "Раунд завершён",
  };
  return (
    <div
      className={
        "timer " +
        (remaining < 180000 && s.room.status === "running" ? "urgent" : "")
      }
    >
      <Clock size={18} />
      <strong aria-label="Оставшееся время">{time}</strong>
      <span>{statuses[s.room.status]}</span>
    </div>
  );
}
