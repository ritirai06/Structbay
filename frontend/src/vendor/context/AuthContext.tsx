import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

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
    if (!localStorage.getItem('vendor_token')) { setLoading(false); return; }
    try {
      const res = await api.me();
      setUser(res.data);
    } catch {
      localStorage.removeItem('vendor_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    localStorage.setItem('vendor_token', res.data.token);
    setUser(res.data.vendor);
  }

  async function logout() {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('vendor_token');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
