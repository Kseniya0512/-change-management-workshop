import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Check, ArrowRight, Info } from "lucide-react";
import type { Answer, Answers } from "../shared/types";
import { list, text } from "../shared/model";
import { stateCards, phases, messages } from "../shared/content";
export interface FormContext {
  answers: Answers;
  editable: boolean;
  checked?: boolean;
  set: (key: string, value: Answer, immediate?: boolean) => void;
  commit: (key: string) => void;
}
export const Form = createContext<FormContext>({
  answers: {},
  editable: false,
  set: () => {},
  commit: () => {},
});
export const useForm = () => useContext(Form);
export function Field({
  name,
  label,
  placeholder,
  multiline = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const f = useForm();
  const props = {
    id: "f-" + name,
    "aria-label": label,
    value: text(f.answers, name),
    placeholder,
    disabled: !f.editable,
    maxLength: 4000,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      f.set(name, e.target.value),
    onBlur: () => f.commit(name),
  };
  return (
    <label className="field" htmlFor={props.id}>
      <span>{label}</span>
      {multiline ? <textarea {...props} rows={3} /> : <input {...props} />}
    </label>
  );
}
export function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly (string | readonly [string, string])[];
}) {
  const f = useForm();
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={text(f.answers, name)}
        disabled={!f.editable}
        onChange={(e) => f.set(name, e.target.value, true)}
      >
        <option value="">Выберите вариант</option>
        {options.map((o) => {
          const [v, t] = typeof o === "string" ? [o, o] : o;
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    </label>
  );
}
export function Choices({
  name,
  options,
  compact = false,
}: {
  name: string;
  options: readonly (readonly [string, string, string?])[];
  compact?: boolean;
}) {
  const f = useForm();
  return (
    <div className={"choices " + (compact ? "compact" : "")}>
      {options.map(([v, label, desc], i) => (
        <button
          key={v}
          className={
            "choice " +
            (f.answers[name] === v
              ? "selected " + (f.checked ? feedback(name, v) : "")
              : "")
          }
          disabled={!f.editable}
          aria-label={label}
          aria-pressed={f.answers[name] === v}
          onClick={() => f.set(name, v, true)}
        >
          <span className="choice-mark">
            {f.answers[name] === v ? (
              <Check size={14} />
            ) : compact ? (
              ""
            ) : (
              String.fromCharCode(1040 + i)
            )}
          </span>
          <span>
            <strong>{label}</strong>
            {desc && <small>{desc}</small>}
          </span>
          {!compact && <ArrowRight className="choice-arrow" size={17} />}
        </button>
      ))}
    </div>
  );
}
export function Multi({
  name,
  options,
  max,
}: {
  name: string;
  options: readonly (string | readonly [string, string])[];
  max?: number;
}) {
  const f = useForm(),
    values = list(f.answers, name);
  return (
    <div className="multi">
      {options.map((o) => {
        const [v, label] = typeof o === "string" ? [o, o] : o;
        const selected = values.includes(v);
        return (
          <label
            className={
              "multi-option " +
              (selected
                ? "selected " +
                  (f.checked && name === "metrics"
                    ? ["active", "communications"].includes(v)
                      ? "correct"
                      : "incorrect"
                    : "")
                : "")
            }
            key={v}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={
                !f.editable || (!selected && !!max && values.length >= max)
              }
              onChange={() =>
                f.set(
                  name,
                  selected ? values.filter((x) => x !== v) : [...values, v],
                  true,
                )
              }
            />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}
export function Block({
  title,
  children,
  number,
  description,
}: {
  title: string;
  children: ReactNode;
  number?: string;
  description?: string;
}) {
  return (
    <section className="block">
      <div className="block-heading">
        {number && <span className="block-number">{number}</span>}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
export function Notice({
  children,
  type = "info",
}: {
  children: ReactNode;
  type?: "info" | "warning" | "success";
}) {
  return (
    <div className={"notice " + type}>
      <Info size={18} />
      <div>{children}</div>
    </div>
  );
}

function feedback(key: string, value: string) {
  const correct: Record<string, string> = {
    cei: "notify",
    goal: "adoption",
    level: "large",
    sponsor: "executive",
    eventResponse: "diagnose",
  };
  if (correct[key]) return value === correct[key] ? "correct" : "incorrect";
  if (key.startsWith("state."))
    return value === stateCards[Number(key.split(".")[1])]?.[1]
      ? "correct"
      : "incorrect";
  if (key.startsWith("criterion."))
    return [4, 5, 7].includes(Number(key.split(".")[1]))
      ? "caution"
      : value === "yes"
        ? "correct"
        : "incorrect";
  if (key === "route" && value === "all") return "caution";
  return "";
}
