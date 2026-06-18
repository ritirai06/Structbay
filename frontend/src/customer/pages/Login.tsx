import { useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router";
import { Mail, Eye, EyeOff, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiV1Base } from "../../lib/apiBase";
import { clearCustomerSession, setCustomerSession } from "../lib/authStorage";
import { CustomerAuthLayout } from "../components/CustomerAuthLayout";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { cn } from "@shared/components/ui/utils";

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

type AuthPath = "login" | "forgot" | "reset";

function useAuthPath(): AuthPath {
  const { pathname } = useLocation();
  if (pathname.includes("forgot-password")) return "forgot";
  if (pathname.includes("reset-password")) return "reset";
  return "login";
}

export function Login() {
  const authPath = useAuthPath();
  const { setIsLoggedIn, setUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next")?.trim() || "";
  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname?.trim() || "";
  const resetToken = searchParams.get("token")?.trim() || "";

  const [mode, setMode] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [verifyResendLoading, setVerifyResendLoading] = useState(false);
  const [verifyResendMsg, setVerifyResendMsg] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotDone, setForgotDone] = useState(false);

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const base = getApiV1Base().replace(/\/$/, "");

  const isUnverifiedCustomerError = (msg: string) => /verify your email/i.test(msg);

  const handleResendVerification = async () => {
    setVerifyResendMsg("");
    if (!email.trim()) {
      setVerifyResendMsg("Enter your email above, then tap Resend again.");
      return;
    }
    setVerifyResendLoading(true);
    try {
      const res = await fetch(`${base}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const raw = await res.text();
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          setVerifyResendMsg("Unexpected response from server.");
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setVerifyResendMsg(formatAuthErrors(json));
        return;
      }
      setVerifyResendMsg(
        typeof json.message === "string"
          ? json.message
          : "If this account exists and is not verified yet, a new link was sent. Check Spam / Promotions."
      );
    } catch {
      setVerifyResendMsg("Network error. Try again.");
    } finally {
      setVerifyResendLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setVerifyResendMsg("");

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

      const returnPath = nextPath.startsWith("/")
        ? nextPath
        : fromPath.startsWith("/")
          ? fromPath
          : "/";
      const dest = returnPath === "/dashboard" ? "/" : returnPath;
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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!forgotEmail.trim()) {
      setLoginError("Enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${base}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const raw = await res.text();
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          setLoginError("Unexpected response from server.");
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setLoginError(formatAuthErrors(json));
        return;
      }
      setForgotDone(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!resetToken) {
      setLoginError("Reset link is invalid or expired. Request a new link from Forgot password.");
      return;
    }
    if (!newPass || !confirmPass) {
      setLoginError("Enter and confirm your new password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${base}/auth/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPass, confirmPassword: confirmPass }),
      });
      const raw = await res.text();
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          setLoginError("Unexpected response from server.");
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setLoginError(formatAuthErrors(json));
        return;
      }
      navigate("/login", { replace: true });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const title =
    authPath === "forgot"
      ? "Forgot password"
      : authPath === "reset"
        ? "Set new password"
        : "Sign in";

  const subtitle =
    authPath === "forgot"
      ? "We will email you a reset link if an account exists for that address."
      : authPath === "reset"
        ? "Choose a strong password for your StructBay account."
        : "Customer portal — use your business email.";

  return (
    <CustomerAuthLayout visualVariant="login">
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-[#1A1A1A]">{title}</h2>
        <p className="text-sm text-[#1A1A1A]/60">{subtitle}</p>
      </div>

      {authPath === "forgot" && (
        <form onSubmit={handleForgot} className="space-y-4">
          {loginError && (
            <div className="rounded-lg border border-[#1A1A1A]/15 bg-gray-50 px-3 py-2 text-sm text-[#1A1A1A]/85">
              {loginError}
            </div>
          )}
          {forgotDone ? (
            <p className="text-sm text-[#1A1A1A]/75 leading-relaxed">
              If an account exists with that email, a reset link has been sent. Check your inbox and spam folder.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 border-[#1A1A1A]/12 bg-gray-50 pl-10 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full gap-2 text-base font-semibold shadow-md">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </>
          )}
          <p className="text-center text-sm text-[#1A1A1A]/55">
            <Link to="/login" className="font-semibold text-[#E85A00] hover:text-[#CC4E00]">
              Back to sign in
            </Link>
          </p>
        </form>
      )}

      {authPath === "reset" && (
        <form onSubmit={handleReset} className="space-y-4">
          {loginError && (
            <div className="rounded-lg border border-[#1A1A1A]/15 bg-gray-50 px-3 py-2 text-sm text-[#1A1A1A]/85">
              {loginError}
            </div>
          )}
          {!resetToken && (
            <p className="text-sm text-[#1A1A1A]/70">
              Open the reset link from your email, or{" "}
              <Link to="/forgot-password" className="font-semibold text-[#E85A00] hover:underline">
                request a new link
              </Link>
              .
            </p>
          )}
          {!!resetToken && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
                  <Input
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Min. 8 characters, mixed case, number, symbol"
                    className="h-11 border-[#1A1A1A]/12 bg-gray-50 pl-10 pr-10 text-[#1A1A1A] placeholder:text-[#1A1A1A]/35 focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/45 hover:text-[#1A1A1A]"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
                  <Input
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repeat password"
                    className="h-11 border-[#1A1A1A]/12 bg-gray-50 pl-10 text-[#1A1A1A] placeholder:text-[#1A1A1A]/35 focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full gap-2 text-base font-semibold shadow-md">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Updating…" : "Update password"}
              </Button>
            </>
          )}
          <p className="text-center text-sm text-[#1A1A1A]/55">
            <Link to="/login" className="font-semibold text-[#E85A00] hover:text-[#CC4E00]">
              Back to sign in
            </Link>
          </p>
        </form>
      )}

      {authPath === "login" && (
        <>
          <p className="text-sm text-[#1A1A1A]/65 mb-5">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-[#E85A00] hover:text-[#CC4E00]">
              Register
            </Link>
          </p>

          <div className="mb-6 flex rounded-xl border border-[#1A1A1A]/10 bg-gray-50 p-1">
            {(["email", "otp"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setLoginError("");
                  setVerifyResendMsg("");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                  mode === m
                    ? "bg-[#E85A00] text-white shadow-sm"
                    : "text-[#1A1A1A]/55 hover:text-[#1A1A1A]"
                )}
              >
                {m === "email" ? (
                  <>
                    <Mail className="h-3.5 w-3.5" /> Email
                  </>
                ) : (
                  <>
                    <Phone className="h-3.5 w-3.5" /> OTP
                  </>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="rounded-lg border border-[#1A1A1A]/15 bg-gray-50 px-3 py-2 text-sm text-[#1A1A1A]/85">
                {loginError}
              </div>
            )}

            {mode === "email" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="h-11 border-[#1A1A1A]/12 bg-gray-50 pl-10 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">
                      Password
                    </Label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-[#E85A00] hover:text-[#CC4E00]">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="h-11 border-[#1A1A1A]/12 bg-gray-50 pl-10 pr-10 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/45 hover:text-[#1A1A1A]"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isUnverifiedCustomerError(loginError) && (
                  <div className="rounded-lg border border-[#E85A00]/25 bg-[#FFF7ED] px-3 py-3 text-sm text-[#1A1A1A]/90 space-y-2">
                    <p className="leading-relaxed text-[#1A1A1A]/85">
                      ईमेल में लिंक नहीं मिला? Spam देखें, या नीचे Resend दबाएँ।
                    </p>
                    {verifyResendMsg ? (
                      <p className="text-xs whitespace-pre-line text-[#1A1A1A]/80">{verifyResendMsg}</p>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={verifyResendLoading}
                      className="w-full h-10 border-[#1A1A1A]/20 text-[#1A1A1A]"
                      onClick={() => void handleResendVerification()}
                    >
                      {verifyResendLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                          Sending…
                        </>
                      ) : (
                        "Resend verification email"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">Mobile</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="h-11 border-[#1A1A1A]/12 bg-gray-50 pl-10 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 shrink-0 px-4 font-semibold"
                      onClick={() => setOtpSent(true)}
                    >
                      {otpSent ? "Resend" : "Send OTP"}
                    </Button>
                  </div>
                </div>
                {otpSent && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/55">OTP</Label>
                    <Input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      maxLength={6}
                      className="h-11 border-[#1A1A1A]/12 bg-gray-50 text-center tracking-[0.35em] text-[#1A1A1A] focus-visible:border-[#E85A00] focus-visible:ring-[#E85A00]/25"
                    />
                  </div>
                )}
              </>
            )}

            <Button type="submit" disabled={loading} className="mt-2 h-11 w-full gap-2 text-base font-semibold shadow-md">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in…" : mode === "otp" && !otpSent ? "Send OTP" : "Sign in"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-[#1A1A1A]/45">
            By signing in you agree to our{" "}
            <a href="/terms" className="font-medium text-[#1A1A1A]/55 underline-offset-2 hover:text-[#E85A00] hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-medium text-[#1A1A1A]/55 underline-offset-2 hover:text-[#E85A00] hover:underline">
              Privacy
            </a>
            .
          </p>
        </>
      )}
    </CustomerAuthLayout>
  );
}
