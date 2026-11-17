import type { Snapshot } from "../shared/types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public snapshot?: Snapshot,
  ) {
    super(message);
  }
}
export async function api<T = Snapshot>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      "Нет связи с сервером. Текст остаётся в открытой вкладке. Восстановите соединение и повторите сохранение.",
      0,
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error ?? "Не удалось выполнить запрос",
      response.status,
      data.snapshot,
    );
  return data;
}
