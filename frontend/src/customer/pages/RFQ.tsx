import { useState } from "react";
import { Link } from "react-router";
import { FileText, CheckCircle2, AlertCircle, Phone, Building2, MapPin } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiV1Base } from "../../lib/apiBase";
import { getCustomerAccessToken } from "../lib/authStorage";
import { UtilityBreadcrumb, UtilityCard, UtilityHero, UtilityPage } from "../components/UtilityPageLayout";

const GRADES = ["M20", "M25", "M30", "M35", "M40", "M45", "M50"];
const FLOORS = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor", "Above 5th Floor"];

export function RFQ() {
  const { user, isLoggedIn } = useApp();

  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const [form, setForm] = useState({
    name:        isLoggedIn ? (user?.name || "") : "",
    company:     isLoggedIn ? (user?.company || "") : "",
    phone:       "",
    email:       isLoggedIn ? (user?.email || "") : "",
    grade:       "M25",
    qty:         "",
    floorLevel:  "",
    pumpRequired: false,
    address:     "",
    city:        "",
    deliveryDate:"",
    notes:       "",
  });

  const update = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        customerName:  form.name,
        customerPhone: form.phone,
        customerEmail: form.email || undefined,
        companyName:   form.company || undefined,
        grade:         form.grade,
        quantity:      Number(form.qty),
        floorLevel:    form.floorLevel || undefined,
        pumpRequired:  form.pumpRequired,
        location:      form.address,
        siteAddress:   form.address,
        city:          form.city,
        deliveryDate:  form.deliveryDate || undefined,
        notes:         form.notes || undefined,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getCustomerAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${getApiV1Base()}/concrete-rfqs`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      setRefNumber(data.data?.rfqNumber || "");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
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
          <h2>RFQ submitted successfully</h2>
          <p>
            Our concrete procurement team will contact you within <strong>2 business hours</strong> with a competitive quote.
          </p>
          {refNumber && (
            <div className="sf-utility-ref">
              <p className="sf-utility-ref__label">Your RFQ reference</p>
              <p className="sf-utility-ref__value">{refNumber}</p>
            </div>
          )}
          <div className="sf-utility-actions" style={{ justifyContent: "center" }}>
            <Link to="/" className="sf-utility-btn-primary">Back to home</Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setRefNumber("");
                setForm((f) => ({ ...f, qty: "", floorLevel: "", address: "", notes: "" }));
              }}
              className="sf-utility-btn-secondary"
            >
              New RFQ
            </button>
          </div>
        </div>
      </UtilityPage>
    );
  }

  return (
    <UtilityPage width="medium">
      <UtilityBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Concrete RFQ" }]} />

      <UtilityHero
        variant="brand"
        icon={FileText}
        title="Ready mix concrete RFQ"
        description="Get competitive quotes for ready mix concrete from top suppliers in your city."
        features={["Multiple supplier quotes", "Best price guarantee", "IS code certified"]}
      />

      <UtilityCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your Name *</label>
              <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Full name" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company Name *</span>
              </label>
              <input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Company / contractor name" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number *</span>
              </label>
              <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="email@company.com" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Concrete Grade *</label>
              <select value={form.grade} onChange={e => update("grade", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none">
                {GRADES.map(g => <option key={g} value={g}>{g} – {g === "M20" ? "Light Structural" : g === "M25" ? "General Structural" : g === "M30" ? "Bridges / Heavy" : g === "M35" ? "High Strength" : g === "M40" ? "Very High Strength" : g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Quantity (Cubic Metres) *</label>
              <input
                type="number" min="1"
                value={form.qty} onChange={e => update("qty", e.target.value)}
                placeholder="e.g. 50"
                required
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Floor Level of Concreting</label>
              <select value={form.floorLevel} onChange={e => update("floorLevel", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none">
                <option value="">Select floor level</option>
                {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> City *</span>
              </label>
              <input value={form.city} onChange={e => update("city", e.target.value)} placeholder="e.g. Bengaluru" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Required Delivery Date</label>
              <input
                type="date"
                value={form.deliveryDate}
                onChange={e => update("deliveryDate", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Site Address *</label>
            <textarea value={form.address} onChange={e => update("address", e.target.value)} placeholder="Full site address with landmark and pincode" rows={3} required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none resize-none" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.pumpRequired} onChange={e => update("pumpRequired", e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-foreground">Concrete pump required at site</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Additional Notes</label>
            <textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Any special requirements, admixtures, site access notes..." rows={2} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none resize-none" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sf-utility-btn-primary w-full justify-center py-3 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit RFQ — get free quote"}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            You will receive a reference such as <strong className="text-foreground">RFQCON2606120001</strong> (RFQCON + date + sequence). Our team responds within 2 business hours.
          </p>
        </form>
      </UtilityCard>
    </UtilityPage>
  );
}
