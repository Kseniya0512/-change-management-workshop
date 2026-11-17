import {
  Check,
  HelpCircle,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "./room-ui";
export function ProductHeader({
  local = false,
  activePlan = false,
  onGame,
  onPlan,
  gameLabel = "Игра",
  canHelp = true,
}: {
  local?: boolean;
  activePlan?: boolean;
  onGame: () => void;
  onPlan?: () => void;
  gameLabel?: string;
  canHelp?: boolean;
}) {
  return (
    <header className="product-header">
      <div className="product-header-inner">
        <button
          className="brand-link"
          onClick={onGame}
          aria-label="К началу игры"
        >
          <Brand />
        </button>
        <span className="product-brand-divider" />
        <p className="product-caption">
          Командный воркшоп
          <br />
          по изменениям
        </p>
        <nav className="product-nav" aria-label="Основная навигация">
          <button className={!activePlan ? "active" : ""} onClick={onGame}>
            {gameLabel}
          </button>
          {onPlan && (
            <button
              aria-label="План команды"
              className={activePlan ? "active" : ""}
              onClick={onPlan}
            >
              <span className="nav-full">План команды</span>
              <span className="nav-short">План</span>
            </button>
          )}
        </nav>
        <span className="product-mode">
          <i />
          {local ? "Локальный режим" : "Командный режим"}
        </span>
        {canHelp && (
          <button
            className="product-help"
            aria-label="Помощь ЦЭИ"
            title="Помощь ЦЭИ"
            onClick={() => {
              const target = document.getElementById("cei-help");
              if (target) {
                target.focus({ preventScroll: true });
                target.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                  block: "center",
                });
              }
            }}
          >
            <HelpCircle size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
export function ProductFooter({ local = false }: { local?: boolean }) {
  return (
    <footer className="product-footer">
      <div>
        <span>
          <strong>РТК ИТ</strong> · Практика управления изменениями
        </span>
        <span>
          <ShieldCheck size={14} />
          {local
            ? "Локальный режим · сохраняйте резервную копию"
            : "Командный воркшоп · от обсуждения к действию"}
        </span>
      </div>
    </footer>
  );
}
export function HeroArt() {
  return (
    <div className="feedback-hero-art" aria-hidden="true">
      <span className="feedback-orbit" />
      <span className="feedback-orbit inner" />
      <span className="feedback-art-core">
        <MessageSquareText size={66} />
      </span>
      <span className="feedback-art-note one">
        <Check size={17} />
        Единый рабочий канал
      </span>
      <span className="feedback-art-note two">
        <Sparkles size={17} />
        Меняем привычки вместе
      </span>
      <i className="feedback-art-spark" />
      <i className="feedback-art-spark orange" />
    </div>
  );
}
