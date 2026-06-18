import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import {
  clearVendorSession,
  getVendorAccessToken,
  getVendorRefreshToken,
  refreshVendorAccessToken,
  setVendorSession,
  VENDOR_TOKEN_KEY,
} from '../lib/authStorage';

interface VendorUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
  profileImage?: { url: string };
  vendorStatus?: string;
}

interface AuthCtx {
  user: VendorUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VendorUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    let t = getVendorAccessToken();
    if (!t && getVendorRefreshToken()) {
      const ok = await refreshVendorAccessToken();
      if (ok) t = getVendorAccessToken();
    }
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.me();
      setUser(res.data);
    } catch {
      clearVendorSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const onSessionCleared = () => setUser(null);
    window.addEventListener('vendor-session-cleared', onSessionCleared);
    return () => window.removeEventListener('vendor-session-cleared', onSessionCleared);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VENDOR_TOKEN_KEY && !e.newValue) setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    const accessToken = res.data.accessToken ?? res.data.token;
    const refreshToken = res.data.refreshToken;
    if (!accessToken) throw new Error('Login response was incomplete.');
    setVendorSession({ accessToken, refreshToken });
    setUser(res.data.vendor);
  }

  async function logout() {
    try { await api.logout(); } catch { /* ignore */ }
    clearVendorSession();
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
