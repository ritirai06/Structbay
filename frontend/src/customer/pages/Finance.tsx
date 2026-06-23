import { useState } from "react";
import { Link } from "react-router";
import { TrendingUp, CheckCircle2, Shield, Clock, Percent, AlertCircle } from "lucide-react";
import { getApiV1Base } from "../../lib/apiBase";
import { getCustomerAccessToken } from "../lib/authStorage";
import { UtilityBreadcrumb, UtilityCard, UtilityHero, UtilityPage } from "../components/UtilityPageLayout";

export function Finance() {
  const [submitted, setSubmitted] = useState(false);
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company: "",
    projectValue: "",
    loanAmount: "",
    location: "",
    name: "",
    phone: "",
    email: "",
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const parseAmount = (raw: string) => {
    const n = parseFloat(String(raw).replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loanAmountRequired = parseAmount(form.loanAmount);
      if (loanAmountRequired == null) {
        setError("Enter a valid loan amount (numbers only, commas allowed).");
        setLoading(false);
        return;
      }

      const base = getApiV1Base().replace(/\/$/, "");
      const token = getCustomerAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${base}/finance/applications`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.company.trim(),
          mobile: form.phone.trim(),
          email: form.email.trim(),
          projectLocation: form.location.trim(),
          loanAmountRequired,
          projectValue: form.projectValue.trim() || undefined,
          remarks: "StructBay finance — submitted via storefront",
        }),
      });
      const text = await res.text();
      let json: { success?: boolean; message?: string; data?: { financeNumber?: string } } = {};
      if (text) {
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          setError("Unexpected response from server.");
          setLoading(false);
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setError(json.message || `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      setRef(json.data?.financeNumber || "");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <UtilityPage width="narrow">
        <div className="sf-utility-success">
          <div className="sf-utility-success__icon">
            <CheckCircle2 aria-hidden />
          </div>
          <h2>Application submitted</h2>
          <p>Our finance team will review your application and contact you within 24 business hours.</p>
          {ref && (
            <div className="sf-utility-ref">
              <p className="sf-utility-ref__label">Your reference</p>
              <p className="sf-utility-ref__value">{ref}</p>
            </div>
          )}
          <Link to="/" className="sf-utility-btn-primary">Back to home</Link>
        </div>
      </UtilityPage>
    );
  }

  return (
    <UtilityPage width="medium">
      <UtilityBreadcrumb items={[{ label: "Home", to: "/" }, { label: "StructBay finance" }]} />

      <UtilityHero
        variant="brand"
        icon={TrendingUp}
        title="StructBay finance"
        description="Construction finance up to ₹5 Crore. Fast approval, competitive rates, and flexible repayment for builders and developers across South India."
        features={["Up to ₹5 Cr", "From 10.5% interest", "48-hour approval"]}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Shield, label: "Secured Financing", desc: "Backed by leading NBFCs and banks" },
          { icon: Clock, label: "Fast Approval", desc: "Decision within 48 business hours" },
          { icon: Percent, label: "Best Rates", desc: "Competitive rates from 10.5% p.a." },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="sf-utility-card text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center mx-auto mb-3">
              <Icon className="w-5 h-5 text-white" aria-hidden />
            </div>
            <p className="font-semibold text-sm text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <UtilityCard>
        <h3 className="font-semibold text-foreground mb-5 text-sm uppercase tracking-wider">Apply for StructBay finance</h3>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ["Company Name *", "company", "text", "Construction company name"],
              ["Project Value (₹) *", "projectValue", "text", "e.g. 2,50,00,000"],
              ["Loan Amount Required (₹) *", "loanAmount", "text", "e.g. 1,00,00,000"],
              ["Project Location *", "location", "text", "City, Area"],
              ["Contact Person *", "name", "text", "Full name"],
              ["Phone Number *", "phone", "tel", "+91 98765 43210"],
            ].map(([label, key, type, ph]) => (
              <div key={key as string}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                <input
                  type={type as string}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => update(key as string, e.target.value)}
                  placeholder={ph as string}
                  required
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@company.com"
              required
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="sf-utility-btn-primary w-full justify-center py-3 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit finance application"}
          </button>
        </form>
      </UtilityCard>
    </UtilityPage>
  );
}
