import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";
import { getApiV1Base } from "../../lib/apiBase";
import { clearAdminSession, setAdminSession } from "../../lib/adminApi";

type LoginEnvelope = {
  success: boolean;
  message?: string;
  data?: {
    user?: { role?: string; name?: string; email?: string };
    accessToken?: string;
    refreshToken?: string;
  };
};

function formatAuthErrors(json: Record<string, unknown>): string {
  const msg = typeof json.message === "string" ? json.message : "Request failed";
  const errs = json.errors;
  if (!Array.isArray(errs) || errs.length === 0) return msg;
  const lines = errs
    .map((x: unknown) => {
      if (x && typeof x === "object" && "message" in x) {
        const o = x as { field?: string; message?: string };
        if (o.field && o.message) return `${o.field}: ${o.message}`;
        return o.message || "";
      }
      return "";
    })
    .filter(Boolean);
  return lines.length ? `${msg}\n${lines.join("\n")}` : msg;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    String((location.state as { from?: string }).from).startsWith("/admin")
      ? (location.state as { from: string }).from
      : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    clearAdminSession();
    const base = getApiV1Base().replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const rawText = await res.text();
      let json: Record<string, unknown> = {};
      if (rawText) {
        try {
          json = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          throw new Error(
            `Bad response (HTTP ${res.status}). Run the frontend with Vite so /api proxies to the API, or set VITE_API_URL.`
          );
        }
      }
      if (!res.ok || json.success === false) {
        setError(formatAuthErrors(json));
        return;
      }

      const data = json.data as LoginEnvelope["data"] | undefined;
      const accessToken = data?.accessToken;
      const refreshToken = data?.refreshToken;
      if (!accessToken) {
        setError("Login succeeded but no access token was returned. Check API configuration.");
        return;
      }

      const meRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meText = await meRes.text();
      let meJson: Record<string, unknown> = {};
      if (meText) {
        try {
          meJson = JSON.parse(meText) as Record<string, unknown>;
        } catch {
          setError("Could not read session after login. Try again.");
          return;
        }
      }
      if (!meRes.ok || meJson.success === false) {
        setError(formatAuthErrors(meJson) || "Session check failed after login.");
        return;
      }

      const u = meJson.data as { role?: string } | undefined;
      if (u?.role !== "ADMIN") {
        setError("This portal is for admin accounts only. Use the customer or vendor login for your role.");
        return;
      }

      setAdminSession({ accessToken, refreshToken });
      queueMicrotask(() => navigate(redirectTo));
    } catch (err) {
      const m = err instanceof Error ? err.message : "Network error";
      setError(
        /Vite|proxy|Bad response|JSON|fetch/i.test(m)
          ? m
          : `${m} — Start the backend and open the app via the Vite dev server so /api is proxied.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-sb-ink/10 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <img src={logoImg} alt="Structbay" className="mx-auto h-14 w-auto object-contain mb-4" />
            <span className="inline-block rounded-full border border-sb-ink/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sb-ink/55 mb-3">
              Admin
            </span>
            <h1 className="text-xl font-semibold text-sb-ink">Sign in</h1>
            <p className="text-sm text-sb-ink/55 mt-1">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2 whitespace-pre-line" role="alert">
                {error}
              </p>
            ) : null}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sb-ink/55 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/40" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@structbay.com"
                  required
                  className="w-full rounded-lg border border-sb-ink/15 bg-white py-2.5 pl-10 pr-4 text-sm text-sb-ink placeholder:text-sb-ink/40 transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-sb-orange/20"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-sb-ink/55">Password</label>
                <a href="#" className="text-xs text-sb-orange hover:text-sb-orange-hover transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/40" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-sb-ink/15 bg-white py-2.5 pl-10 pr-10 text-sm text-sb-ink placeholder:text-sb-ink/40 transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-sb-orange/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink/40 hover:text-sb-ink/70 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-sb-ink/20 accent-sb-orange"
              />
              <label htmlFor="remember" className="text-sm text-sb-ink/60 cursor-pointer">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sb-orange hover:bg-sb-orange-hover active:scale-[0.98] text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-sb-ink/45 mt-6">
          © 2025 Structbay Technologies Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
