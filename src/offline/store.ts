import { z } from "zod";
import { validField } from "../../shared/model";
import type { Team } from "../../shared/types";
export interface OfflineState {
  format: "messenger-workshop-offline";
  version: 1;
  teams: Team[];
  currentTeamId: string;
  status: "waiting" | "running" | "paused" | "finished";
  remainingMs: number;
  endsAt: number | null;
}
interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}
export const STORAGE_KEY = "smena.messenger.offline.v1";
export function createOffline(): OfflineState {
  return {
    format: "messenger-workshop-offline",
    version: 1,
    teams: Array.from({ length: 3 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Команда ${i + 1}`,
      answers: {},
      versions: {},
      step: 0,
      checked: [],
    })),
    currentTeamId: "team-1",
    status: "waiting",
    remainingMs: 1800000,
    endsAt: null,
  };
}
const answer = z.union([
  z.string().max(4000),
  z.array(z.string().max(500)).max(20),
]);
const schema = z.object({
  format: z.literal("messenger-workshop-offline"),
  version: z.literal(1),
  teams: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        name: z
          .string()
          .max(60)
          .transform((name) => name.trim() || "Команда"),
        answers: z.record(z.string().max(80), answer).superRefine((a, ctx) => {
          for (const [key, value] of Object.entries(a))
            if (!validField(key, value))
              ctx.addIssue({
                code: "custom",
                message: "Недопустимый ответ",
                path: [key],
              });
        }),
        versions: z.record(z.string(), z.number().int().nonnegative()),
        step: z.number().int().min(0).max(8),
        checked: z.array(z.number().int().min(0).max(7)).max(8),
      }),
    )
    .min(1)
    .max(3),
  currentTeamId: z.string().max(80),
  status: z.enum(["waiting", "running", "paused", "finished"]),
  remainingMs: z.number().min(0).max(1800000),
  endsAt: z.number().int().nonnegative().nullable(),
});
export function remaining(s: OfflineState, now = Date.now()) {
  return s.status === "running"
    ? Math.max(0, (s.endsAt ?? now) - now)
    : s.remainingMs;
}
export function parseOffline(raw: string, now = Date.now()): OfflineState {
  if (raw.length > 2 * 1024 * 1024) throw new Error("Файл больше 2 МБ");
  const s = schema.parse(JSON.parse(raw));
  if (
    !s.teams.some((t) => t.id === s.currentTeamId) ||
    new Set(s.teams.map((t) => t.id)).size !== s.teams.length
  )
    throw new Error("Некорректные рабочие листы");
  if (s.status === "running") {
    if (s.endsAt === null || remaining(s, now) > 1800000)
      throw new Error("Некорректный таймер");
    s.remainingMs = remaining(s, now);
    if (s.remainingMs === 0) {
      s.status = "finished";
      s.endsAt = null;
    }
  }
  return s;
}
export function loadOffline(storage: StorageLike): {
  state: OfflineState;
  warning: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { state: raw ? parseOffline(raw) : createOffline(), warning: "" };
  } catch {
    return {
      state: createOffline(),
      warning:
        "Не удалось восстановить сохранение браузера. Можно загрузить резервную копию JSON.",
    };
  }
}
export function saveOffline(state: OfflineState, storage: StorageLike): string {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return "";
  } catch {
    return "Не удалось сохранить ответы в браузере. Игра работает в этой вкладке; скачайте резервную копию перед закрытием.";
  }
}
export function changeTimer(
  s: OfflineState,
  action: "start" | "pause" | "resume" | "finish",
  now = Date.now(),
): OfflineState {
  const next = { ...s };
  if (action === "start" && s.status === "waiting") {
    next.status = "running";
    next.endsAt = now + s.remainingMs;
  } else if (action === "pause" && s.status === "running") {
    next.remainingMs = remaining(s, now);
    next.endsAt = null;
    next.status = next.remainingMs === 0 ? "finished" : "paused";
  } else if (action === "resume" && s.status === "paused") {
    next.status = "running";
    next.endsAt = now + s.remainingMs;
  } else if (action === "finish") {
    next.remainingMs = remaining(s, now);
    next.endsAt = null;
    next.status = "finished";
  }
  return next;
}
