import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2, Check } from "lucide-react";
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
      queueMicrotask(() => navigate("/admin"));
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
    <div className="min-h-screen flex bg-sb-cream">
      {/* Left branding panel */}
      <div className="relative hidden flex-1 flex-col justify-between border-r border-sb-border-dark bg-sb-ink p-12 lg:flex">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(250,243,225,0.15) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sb-orange/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src={logoImg} alt="StructBay" className="h-16 w-auto object-contain" />
          <span className="ml-2 rounded-full border border-sb-border-dark px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--sb-chrome-fg-muted)]">
            Admin
          </span>
        </div>

        {/* Central content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="mb-3 text-4xl font-semibold leading-tight text-[var(--sb-chrome-fg)]">
              Enterprise<br />
              <span className="text-sb-orange">Control Center</span>
            </h1>
            <p className="max-w-xs text-base leading-relaxed text-[var(--sb-chrome-fg-muted)]">
              Full visibility and control over your B2B construction marketplace operations.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Manage 450+ products across 3 cities",
              "Assign & track vendor fulfillment",
              "Monitor revenue, RFQs & orders in real-time",
              "CMS, blogs, pricing & inventory control",
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-sb-orange/20 border border-sb-orange/30 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-sb-orange" strokeWidth={2.5} aria-hidden />
                </div>
                <span className="text-sm text-[var(--sb-chrome-fg-muted)]">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-8 border-t border-sb-border-dark pt-8">
          {[["₹67K+", "Monthly Revenue"], ["180", "Active Orders"], ["38", "Vendors"]].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="font-black text-lg text-sb-orange">{val}</p>
              <p className="text-xs text-[var(--sb-chrome-fg-muted)] mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-sb-cream">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logoImg} alt="StructBay" className="h-14 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="mb-1.5 text-2xl font-semibold text-sb-ink">Admin Sign In</h2>
            <p className="text-sm text-sb-ink/55">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error ? (
              <p className="text-sm text-sb-ink/80 rounded-lg border border-sb-ink/15 bg-sb-cream-secondary px-3 py-2" role="alert">
                {error}
              </p>
            ) : null}
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sb-ink/65 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/45" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@structbay.com"
                  required
                  className="w-full rounded-lg border border-sb-ink/15 bg-sb-cream py-2.5 pl-10 pr-4 text-sm text-sb-ink placeholder:text-sb-ink/40 transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-sb-orange/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-sb-ink/65">Password</label>
                <a href="#" className="text-xs text-sb-orange hover:text-sb-orange-hover transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/45" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-sb-ink/15 bg-sb-cream py-2.5 pl-10 pr-10 text-sm text-sb-ink placeholder:text-sb-ink/40 transition-colors focus:border-sb-orange focus:outline-none focus:ring-2 focus:ring-sb-orange/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink/45 hover:text-sb-ink/60 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-sb-ink/25 bg-sb-cream accent-sb-orange"
              />
              <label htmlFor="remember" className="text-sm text-sb-ink/65 cursor-pointer">
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sb-orange hover:bg-sb-orange-hover active:scale-[0.98] text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(254,94,0,0.22)] mt-2 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Sign In to Admin Panel
            </button>
          </form>

          <p className="text-center text-xs text-sb-ink/40 mt-8">
            © 2025 StructBay Technologies Pvt. Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}
