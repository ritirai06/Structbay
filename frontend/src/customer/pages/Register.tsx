import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Building2, Mail, Phone, User, Lock, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiV1Base } from "../../lib/apiBase";
import { CustomerAuthLayout } from "../components/CustomerAuthLayout";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";

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

/** Digits only, 10 chars for Indian mobile */
function normalizePhone(raw: string): string | undefined {
  const d = raw.replace(/\D/g, "");
  if (d.length === 0) return undefined;
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 10) return d;
  return d.length >= 10 ? d.slice(-10) : undefined;
}

export function Register() {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    company: "",
    mobile: "",
    email: "",
    gst: "",
    billingAddress: "",
    password: "",
    confirmPassword: "",
  });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const base = getApiV1Base().replace(/\/$/, "");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const phone = normalizePhone(form.mobile);
      const body: Record<string, string | undefined> = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      };
      if (phone) body.phone = phone;

      const res = await fetch(`${base}/auth/register/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          setError("Unexpected response from server.");
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setError(formatAuthErrors(json));
        return;
      }

      try {
        const profile = {
          name: form.name,
          company: form.company,
          mobile: form.mobile,
          email: form.email,
          gst: form.gst,
          billingAddress: form.billingAddress,
        };
        localStorage.setItem("sb_customer_profile", JSON.stringify(profile));
      } catch {
        /* ignore */
      }

      setDone(true);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendMsg("");
    setResendLoading(true);
    try {
      const base = getApiV1Base().replace(/\/$/, "");
      const res = await fetch(`${base}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
      });
      const raw = await res.text();
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          setResendMsg("Unexpected response from server.");
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setResendMsg(formatAuthErrors(json));
        return;
      }
      setResendMsg(typeof json.message === "string" ? json.message : "Verification email sent.");
    } catch {
      setResendMsg("Network error. Check that the API is running and try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (done) {
    return (
      <CustomerAuthLayout visualVariant="register">
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-[#222222]">Check your email</h2>
          <p className="text-sm leading-relaxed text-[#222222]/65">
            We sent a verification link to <span className="font-semibold text-[#222222]">{form.email}</span>. After
            verifying, sign in with your email and password. Also check <strong>Spam</strong> / Promotions.
          </p>
          {resendMsg && (
            <p className="text-xs text-[#222222]/75 whitespace-pre-line px-2">{resendMsg}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full font-semibold border-[#222222]/20"
            disabled={resendLoading}
            onClick={() => void handleResendVerification()}
          >
            {resendLoading ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Sending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
          <Button className="h-11 w-full font-semibold" onClick={() => navigate("/login", { replace: true })}>
            Go to sign in
          </Button>
        </div>
      </CustomerAuthLayout>
    );
  }

  return (
    <CustomerAuthLayout visualVariant="register">
      <p className="text-sm text-[#222222]/65 mb-6">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[#FE5E00] hover:text-[#E05200]">
          Sign in
        </Link>
      </p>

      <h2 className="text-xl font-semibold tracking-tight text-[#222222] mb-1">Create your account</h2>
      <p className="text-xs text-[#222222]/50 mb-6">
        Password: 8+ chars, upper & lower case, number, and special character (API requirement).
      </p>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-[#222222]/15 bg-[#FAF3E1] px-3 py-2 text-sm text-[#222222]/85 whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Full name *</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222222]/40" />
              <Input
                required
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Your name"
                className="h-11 border-[#222222]/12 bg-[#FAF3E1] pl-10 text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Company *</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222222]/40" />
              <Input
                required
                value={form.company}
                onChange={e => update("company", e.target.value)}
                placeholder="Firm / company name"
                className="h-11 border-[#222222]/12 bg-[#FAF3E1] pl-10 text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Mobile</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222222]/40" />
              <Input
                type="tel"
                value={form.mobile}
                onChange={e => update("mobile", e.target.value)}
                placeholder="10-digit mobile"
                className="h-11 border-[#222222]/12 bg-[#FAF3E1] pl-10 text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Email *</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222222]/40" />
              <Input
                required
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="h-11 border-[#222222]/12 bg-[#FAF3E1] pl-10 text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">GST (optional)</Label>
          <Input
            value={form.gst}
            onChange={e => update("gst", e.target.value)}
            placeholder="29AABCS1234B1Z5"
            className="h-11 border-[#222222]/12 bg-[#FAF3E1] text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Billing address *</Label>
          <textarea
            required
            value={form.billingAddress}
            onChange={e => update("billingAddress", e.target.value)}
            placeholder="Street, city, pincode"
            rows={2}
            className="w-full resize-none rounded-md border border-[#222222]/12 bg-[#FAF3E1] px-3 py-2.5 text-sm text-[#222222] placeholder:text-[#222222]/40 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5E00]/25 focus-visible:border-[#FE5E00]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Password *</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222222]/40" />
              <Input
                required
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={e => update("password", e.target.value)}
                placeholder="Strong password"
                autoComplete="new-password"
                className="h-11 border-[#222222]/12 bg-[#FAF3E1] pl-10 pr-10 text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#222222]/45 hover:text-[#222222]"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#222222]/55">Confirm *</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222222]/40" />
              <Input
                required
                type={showPass ? "text" : "password"}
                value={form.confirmPassword}
                onChange={e => update("confirmPassword", e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="h-11 border-[#222222]/12 bg-[#FAF3E1] pl-10 text-[#222222] focus-visible:border-[#FE5E00] focus-visible:ring-[#FE5E00]/25"
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full gap-2 text-base font-semibold shadow-md">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-[#222222]/45">
        By registering you agree to our{" "}
        <a href="/blogs" className="font-medium text-[#222222]/55 hover:text-[#FE5E00] hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/blogs" className="font-medium text-[#222222]/55 hover:text-[#FE5E00] hover:underline">
          Privacy
        </a>
        .
      </p>
    </CustomerAuthLayout>
  );
}
