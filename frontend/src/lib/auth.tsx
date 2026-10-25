import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, LOGOUT_EVENT, tokenStore } from "./api";
import type { AuthResponse, User } from "./types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? "loading" : "anonymous"));

  const signIn = useCallback(
    (data: AuthResponse) => {
      tokenStore.set({ access: data.access, refresh: data.refresh });
      setUserState(data.user);
      setStatus("authenticated");
      // Saved-design flags etc. depend on who is signed in.
      queryClient.invalidateQueries();
      return data.user;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUserState(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  // Restore the session on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .get<User>("/auth/me/")
      .then((me) => {
        setUserState(me);
        setStatus("authenticated");
      })
      .catch(() => {
        tokenStore.set(null);
        setStatus("anonymous");
      });
  }, []);

  // The API client fires this when a refresh token has expired.
  useEffect(() => {
    window.addEventListener(LOGOUT_EVENT, logout);
    return () => window.removeEventListener(LOGOUT_EVENT, logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: async (email, password) => signIn(await api.post<AuthResponse>("/auth/login/", { email, password })),
      register: async (input) => signIn(await api.post<AuthResponse>("/auth/register/", input)),
      logout,
      setUser: setUserState,
    }),
    [user, status, signIn, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Only allow in-app redirects after login (never to another site). */
export function safeNext(next: string | null, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
