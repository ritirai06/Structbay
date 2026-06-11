import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Package, Eye, EyeOff, Phone, Mail, Lock, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiV1Base } from "../../lib/apiBase";
import { clearCustomerSession, setCustomerSession } from "../lib/authStorage";

type LoginEnvelope = {
  success: boolean;
  message?: string;
  data?: {
    user?: { name?: string; email?: string; role?: string };
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

export function Login() {
  const { setIsLoggedIn, setUser } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next")?.trim() || "";
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (mode === "otp") {
      setLoginError("Phone OTP sign-in is not available yet. Please use email and password.");
      return;
    }

    if (!email.trim() || !password) {
      setLoginError("Enter your email and password.");
      return;
    }

    setLoading(true);
    clearCustomerSession();

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
            `Bad response (HTTP ${res.status}). Run the frontend with Vite (npm run dev) so /api proxies to the API, or set VITE_API_URL to your API origin.`
          );
        }
      }

      if (!res.ok || json.success === false) {
        setLoginError(formatAuthErrors(json));
        return;
      }

      const data = json.data as LoginEnvelope["data"] | undefined;
      const accessToken = data?.accessToken;
      const refreshToken = data?.refreshToken;
      if (!accessToken) {
        setLoginError("Login succeeded but no access token was returned. Check API configuration.");
        return;
      }

      // Confirm role from API (avoids relying on nested login payload shape).
      const meRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meText = await meRes.text();
      let meJson: Record<string, unknown> = {};
      if (meText) {
        try {
          meJson = JSON.parse(meText) as Record<string, unknown>;
        } catch {
          setLoginError("Could not read session after login. Try again.");
          return;
        }
      }
      if (!meRes.ok || meJson.success === false) {
        setLoginError(formatAuthErrors(meJson) || "Session check failed after login.");
        return;
      }

      const u = meJson.data as { role?: string; name?: string; email?: string; companyName?: string } | undefined;
      const role = u?.role;
      if (role !== "CUSTOMER") {
        if (role === "VENDOR")
          setLoginError("This account is a vendor. Please use the Vendor Portal to sign in.");
        else if (role === "ADMIN")
          setLoginError("This account is an administrator. Please use the Admin Portal to sign in.");
        else setLoginError("This marketplace login is for customer accounts only.");
        return;
      }

      setCustomerSession({ accessToken, refreshToken });
      setUser({
        name: String(u?.name || ""),
        company: String(u?.companyName || ""),
        email: String(u?.email || email.trim()),
      });
      setIsLoggedIn(true);

      const dest = nextPath.startsWith("/") ? nextPath : "/account";
      queueMicrotask(() => navigate(dest));
    } catch (err) {
      const m = err instanceof Error ? err.message : "Network error";
      setLoginError(
        /Vite|proxy|Bad response|JSON|fetch/i.test(m)
          ? m
          : `${m} — Start the backend and open the storefront via the Vite dev server (npm run dev in frontend) so /api is proxied.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sb-page">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 bg-sb-surface border-r border-sb-ink/10 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #F4E9D8 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FE5E00]/5 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[#FE5E00] flex items-center justify-center">
            <Package className="w-5 h-5 text-sb-on-orange" />
          </div>
          <span className="font-black text-xl text-sb-ink">Struct<span className="text-[#FE5E00]">Bay</span></span>
        </div>

        {/* Central content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-sb-ink leading-tight mb-3">
              Welcome back to<br />
              <span className="text-[#FE5E00]">StructBay</span>
            </h2>
            <p className="text-sb-ink-muted/60 text-base leading-relaxed max-w-xs">
              India's premier B2B construction marketplace. Sign in to manage orders, invoices, and procurement.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Track 100+ orders at once",
              "Download GST-compliant invoices instantly",
              "Get exclusive bulk pricing",
              "Express delivery across South India",
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#FE5E00] shrink-0" />
                <span className="text-sb-ink-muted/70 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10 flex items-center gap-3 bg-sb-surface-2 border border-sb-ink/10 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-[#FE5E00] flex items-center justify-center text-sb-on-orange font-black text-xs shrink-0">R</div>
          <div>
            <p className="text-xs font-semibold text-sb-ink">"StructBay saved us 15% on material costs"</p>
            <p className="text-[10px] text-sb-ink-muted/50 mt-0.5">Rajesh Kumar · Kumar Constructions, Bengaluru</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-sb-page">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#FE5E00] flex items-center justify-center">
              <Package className="w-5 h-5 text-sb-on-orange" />
            </div>
            <span className="font-black text-xl text-sb-ink">Struct<span className="text-[#FE5E00]">Bay</span></span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-sb-ink mb-1">Sign in to your account</h2>
            <p className="text-sb-ink-muted/60 text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#FE5E00] hover:text-[#E05200] font-semibold transition-colors">Register here</Link>
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-sb-surface-2 border border-sb-ink/12 rounded-xl p-1 mb-6">
            {(["email", "otp"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setLoginError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-[#FE5E00] text-sb-on-orange shadow"
                    : "text-sb-ink-muted/60 hover:text-sb-ink"
                }`}
              >
                {m === "email" ? <><Mail className="w-3.5 h-3.5" /> Email</> : <><Phone className="w-3.5 h-3.5" /> OTP</>}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {loginError}
              </div>
            )}

            {mode === "email" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sb-ink-muted/70 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink-muted/40" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="email@company.com" autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-sb-surface-2 border border-white/12 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink-muted/35 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/15 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-sb-ink-muted/70">Password</label>
                    <a href="#" className="text-xs text-[#FE5E00] hover:text-[#E05200] transition-colors">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink-muted/40" />
                    <input
                      type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password" autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-sb-surface-2 border border-white/12 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink-muted/35 focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/15 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink-muted/40 hover:text-sb-ink-muted transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sb-ink-muted/70 mb-1.5">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink-muted/40" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 bg-sb-surface-2 border border-white/12 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink-muted/35 focus:outline-none focus:border-[#FE5E00] transition-colors" />
                    </div>
                    <button type="button" onClick={() => setOtpSent(true)}
                      className="px-3 py-2.5 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange text-xs font-bold rounded-lg shrink-0 transition-colors">
                      {otpSent ? "Resend" : "Send OTP"}
                    </button>
                  </div>
                </div>
                {otpSent && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sb-ink-muted/70 mb-1.5">Enter OTP</label>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6}
                      className="w-full px-4 py-2.5 bg-sb-surface-2 border border-white/12 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink-muted/35 focus:outline-none focus:border-[#FE5E00] tracking-widest text-center transition-colors" />
                  </div>
                )}
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] active:scale-[0.98] text-sb-on-orange font-bold py-3 rounded-lg transition-all duration-200 shadow-[0_4px_16px_rgba(254,94,0,0.25)] mt-2 disabled:opacity-60 disabled:pointer-events-none">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in…" : mode === "otp" && !otpSent ? "Send OTP" : "Sign In"}
              {!loading ? <ArrowRight className="w-4 h-4" /> : null}
            </button>
          </form>

          <p className="text-center text-xs text-sb-ink-muted/30 mt-8">
            By signing in, you agree to our{" "}
            <a href="#" className="text-sb-ink-muted/50 hover:text-[#FE5E00] underline transition-colors">Terms</a> and{" "}
            <a href="#" className="text-sb-ink-muted/50 hover:text-[#FE5E00] underline transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
