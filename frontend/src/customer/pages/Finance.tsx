import { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, TrendingUp, CheckCircle2, Shield, Clock, Percent } from "lucide-react";

export function Finance() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ company: "", projectValue: "", loanAmount: "", location: "", name: "", phone: "", email: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div style={{ backgroundColor: "var(--sb-green, #16a34a)" }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-foreground mb-2">Application Submitted!</h2>
        <p className="text-muted-foreground mb-6">Our finance team will review your application and contact you within 24 business hours.</p>
        <Link to="/" style={{ backgroundColor: "var(--sb-blue)" }} className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-semibold">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Builder Finance</span>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, var(--sb-blue-dark, #0f2850) 0%, var(--sb-blue) 100%)" }} className="rounded-3xl p-8 text-white mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div style={{ backgroundColor: "var(--sb-yellow)" }} className="w-12 h-12 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-white">Builder Finance</h1>
        </div>
        <p className="text-white/80 mb-6">Get construction finance up to ₹5 Crore. Fast approval, competitive rates, and flexible repayment for builders and developers across South India.</p>
        <div className="grid grid-cols-3 gap-4">
          {[["Up to ₹5 Cr", "Loan Amount"], ["From 10.5%", "Interest Rate"], ["48 Hours", "Approval Time"]].map(([val, label]) => (
            <div key={label} className="bg-white/10 rounded-2xl p-4 text-center">
              <p style={{ color: "var(--sb-yellow)" }} className="font-bold text-xl">{val}</p>
              <p className="text-white/60 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Shield, label: "Secured Financing", desc: "Backed by leading NBFCs and banks" },
          { icon: Clock, label: "Fast Approval", desc: "Decision within 48 business hours" },
          { icon: Percent, label: "Best Rates", desc: "Competitive rates from 10.5% p.a." },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4 text-center">
            <div style={{ backgroundColor: "var(--sb-blue)" }} className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-5">Apply for Builder Finance</h3>
        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
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
                <input type={type as string} value={form[key as keyof typeof form]} onChange={e => update(key as string, e.target.value)} placeholder={ph as string} required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address *</label>
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="email@company.com" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
          </div>
          <button type="submit" style={{ backgroundColor: "var(--sb-orange)" }} className="w-full py-3.5 rounded-2xl text-white font-semibold hover:opacity-90 transition-opacity">
            Submit Finance Application
          </button>
        </form>
      </div>
    </div>
  );
}
