import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Package, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Register() {
  const { setIsLoggedIn, setUser } = useApp();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", mobile: "", email: "", gst: "", billingAddress: "", password: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setUser({ name: form.name, company: form.company, email: form.email });
    navigate("/dashboard");
  };

  const fields = [
    { label: "Full Name *", key: "name", type: "text", placeholder: "Your full name" },
    { label: "Company Name *", key: "company", type: "text", placeholder: "Company or Firm name" },
    { label: "Mobile Number *", key: "mobile", type: "tel", placeholder: "+91 98765 43210" },
    { label: "Email Address *", key: "email", type: "email", placeholder: "email@company.com" },
    { label: "GST Number (Optional)", key: "gst", type: "text", placeholder: "29AABCS1234B1Z5" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: "var(--sb-blue)" }}>
      <div className="w-full max-w-xl bg-background rounded-3xl shadow-2xl p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div style={{ backgroundColor: "var(--sb-blue)" }} className="w-9 h-9 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span style={{ color: "var(--sb-blue)" }} className="font-bold text-xl">Struct<span style={{ color: "var(--sb-orange)" }}>Bay</span></span>
        </div>

        <h2 className="text-foreground text-center mb-1">Create Your Account</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Already have an account? <Link to="/login" style={{ color: "var(--sb-blue)" }} className="font-semibold hover:underline">Sign in</Link>
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {["GST Invoices", "Bulk Pricing", "Order Tracking"].map(b => (
            <div key={b} className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sb-blue)" }} />
              {b}
            </div>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => update(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Billing Address *</label>
            <textarea
              value={form.billingAddress}
              onChange={e => update("billingAddress", e.target.value)}
              placeholder="Full billing address with city and pincode"
              rows={2}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={e => update("password", e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full pr-10 px-3 py-2.5 border border-border rounded-xl text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{ backgroundColor: "var(--sb-orange)" }}
            className="w-full py-3.5 rounded-2xl text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By creating an account, you agree to our{" "}
          <a href="#" className="underline">Terms of Service</a> and{" "}
          <a href="#" className="underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
