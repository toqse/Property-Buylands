"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { TOKEN_STORAGE_KEY, AUTH_UNAUTHORIZED_EVENT } from "@/lib/api/client";
import { accountsApi } from "@/lib/api/accounts";
import { mapApiUserToSession } from "@/lib/api/mappers/user";
import type { ApiUser, AuthTokenResponse } from "@/lib/api/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  role: "user" | "admin";
}

interface AuthCtx {
  user: SessionUser | null;
  token: string | null;
  /** False until the session has been restored from localStorage on the client. */
  hydrated: boolean;
  login: (u: SessionUser) => void;
  loginWithToken: (token: string, user: SessionUser) => void;
  loginFromApiResponse: (res: AuthTokenResponse) => void;
  logout: () => Promise<void>;
  getToken: () => string | null;
  refreshProfile: () => Promise<SessionUser | null>;
  /** @deprecated demo only — use API login */
  loginAsAdmin: (email: string) => void;
  /** @deprecated demo only — use API login */
  loginAsUser: (data: { name?: string; email: string; phone?: string }) => void;
}

const USER_KEY = "p4u_user";

const Ctx = createContext<AuthCtx | undefined>(undefined);

function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Always null on server and first client paint so SSR HTML matches hydration.
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readStoredUser());
    setToken(readStoredToken());
    setHydrated(true);
  }, []);

  const persist = useCallback((u: SessionUser | null, t: string | null = null) => {
    setUser(u);
    if (t !== null) {
      setToken(t);
      if (t) localStorage.setItem(TOKEN_STORAGE_KEY, t);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }, []);

  // When any authenticated API call returns 401, the token is no longer valid
  // (deleted/rotated server-side). Clear the local session so the UI logs out.
  useEffect(() => {
    const handleUnauthorized = () => persist(null, "");
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [persist]);

  const loginWithToken = useCallback(
    (t: string, u: SessionUser) => {
      persist(u, t);
    },
    [persist],
  );

  const loginFromApiResponse = useCallback(
    (res: AuthTokenResponse) => {
      loginWithToken(res.token, mapApiUserToSession(res.user));
    },
    [loginWithToken],
  );

  const logout = useCallback(async () => {
    const t = readStoredToken();
    try {
      if (t) await accountsApi.logout(t);
    } catch {
      // clear local session even if network fails
    }
    persist(null, "");
  }, [persist]);

  const getToken = useCallback(() => token ?? readStoredToken(), [token]);

  const refreshProfile = useCallback(async () => {
    const t = getToken();
    if (!t) return null;
    try {
      const profile = await accountsApi.getProfile();
      const mapped = mapApiUserToSession(profile);
      persist(mapped, t);
      return mapped;
    } catch {
      return null;
    }
  }, [getToken, persist]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      token,
      hydrated,
      login: (u) => persist(u),
      loginWithToken,
      loginFromApiResponse,
      logout,
      getToken,
      refreshProfile,
      loginAsAdmin: (email) =>
        persist({ id: "admin", name: "Administrator", email, phone: "", role: "admin" }),
      loginAsUser: ({ name, email, phone }) =>
        persist({
          id: crypto.randomUUID(),
          name: name || email.split("@")[0],
          email,
          phone: phone || "",
          role: "user",
        }),
    }),
    [user, token, hydrated, persist, loginWithToken, loginFromApiResponse, logout, getToken, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};

export function mapUserForSession(apiUser: ApiUser): SessionUser {
  return mapApiUserToSession(apiUser);
}
