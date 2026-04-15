"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authMe, AuthUser } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const stored = (() => {
      try { return localStorage.getItem("taskboard_auth_token"); } catch { return null; }
    })();
    if (!stored) { setLoading(false); return; }

    authMe(stored)
      .then(({ user }) => {
        setToken(stored);
        setUser(user);
      })
      .catch(() => {
        try { localStorage.removeItem("taskboard_auth_token"); } catch { /* ignore */ }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((u: AuthUser, t: string) => {
    setUser(u);
    setToken(t);
    try { localStorage.setItem("taskboard_auth_token", t); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    try { localStorage.removeItem("taskboard_auth_token"); } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
