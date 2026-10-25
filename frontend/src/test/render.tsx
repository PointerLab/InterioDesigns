import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "@/lib/auth";

type Reply = { status?: number; body?: unknown };
type Handler = Reply | ((init: RequestInit) => Reply);

/**
 * Replaces fetch with canned API replies, keyed by "METHOD /api/path/".
 * Returns the mock so tests can inspect the calls.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const path = new URL(String(input), "http://localhost").pathname;
    const key = `${init.method ?? "GET"} ${path}`;
    const handler = routes[key];
    if (!handler) throw new Error(`No mock for ${key}`);
    const { status = 200, body = {} } = typeof handler === "function" ? handler(init) : handler;
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Renders routes with the same providers as the app, starting at `path`. */
export function renderRoutes(routes: ReactNode, path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
