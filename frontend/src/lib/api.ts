/**
 * Small fetch wrapper for the Django API.
 *
 * - Adds the JWT access token and refreshes it once when it expires.
 * - Turns DRF error payloads into an ApiError with a readable message and
 *   per-field messages that forms can show inline.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
const TOKENS_KEY = "interio.tokens";
export const LOGOUT_EVENT = "interio:logout";

interface Tokens {
  access: string;
  refresh: string;
}

export const tokenStore = {
  get(): Tokens | null {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(tokens: Tokens | null) {
    try {
      if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
      else localStorage.removeItem(TOKENS_KEY);
    } catch {
      // Storage can be unavailable (private mode); the session just won't persist.
    }
  },
};

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  return null;
}

export function toApiError(status: number, body: unknown): ApiError {
  const fieldErrors: Record<string, string> = {};
  let message: string | null = null;

  if (body && typeof body === "object" && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const text = firstMessage(value);
      if (!text) continue;
      if (key === "detail" || key === "non_field_errors") message = message ?? text;
      else fieldErrors[key] = text;
    }
  }

  if (!message) {
    const firstField = Object.values(fieldErrors)[0];
    if (firstField) message = firstField;
    else if (status === 429) message = "Too many attempts. Please wait a minute and try again.";
    else if (status >= 500) message = "Something went wrong on our side. Please try again.";
    else message = `Request failed (${status}).`;
  }

  return new ApiError(status, message, fieldErrors);
}

let refreshing: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens?.refresh) return Promise.resolve(null);

  refreshing ??= fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  })
    .then(async (response) => {
      if (!response.ok) {
        tokenStore.set(null);
        window.dispatchEvent(new Event(LOGOUT_EVENT));
        return null;
      }
      const data = await response.json();
      tokenStore.set({ access: data.access, refresh: data.refresh ?? tokens.refresh });
      return data.access as string;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function send(path: string, { method = "GET", body }: RequestOptions = {}): Promise<Response> {
  const run = (token?: string) =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  try {
    const token = tokenStore.get()?.access;
    let response = await run(token);
    if (response.status === 401 && token) {
      const fresh = await refreshAccessToken();
      // If the session is gone, retry anonymously so public pages still load.
      response = await run(fresh ?? undefined);
    }
    return response;
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running and try again.");
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ?? {} }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),

  /** Download a file (e.g. CSV export) using the current session. */
  async download(path: string, filename: string) {
    const response = await send(path);
    if (!response.ok) throw toApiError(response.status, await response.json().catch(() => null));
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
