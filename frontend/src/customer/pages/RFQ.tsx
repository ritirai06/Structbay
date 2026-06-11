import { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, FileText, CheckCircle2, AlertCircle, Phone, Building2, MapPin } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiV1Base } from "../../lib/apiBase";
import { getCustomerAccessToken } from "../lib/authStorage";

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
        customerEmail: user?.email || undefined,
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

      const token = getCustomerAccessToken();
      if (!token) {
        throw new Error("Please sign in with a valid StructBay customer account (session required for concrete RFQ).");
      }
      const res = await fetch(`${getApiV1Base()}/concrete-rfqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-sb-cream" />
        </div>
        <h2 className="text-foreground mb-2">RFQ Submitted Successfully!</h2>
        <p className="text-muted-foreground mb-4">
          Our concrete procurement team will contact you within <strong>2 business hours</strong> with the best competitive quote.
        </p>
        {refNumber && (
          <div className="bg-muted rounded-2xl px-6 py-4 mb-6 inline-block">
            <p className="text-xs text-muted-foreground mb-1">Your RFQ Reference Number</p>
            <p className="font-black text-lg" style={{ color: "var(--sb-orange)" }}>{refNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">Please keep this for your records</p>
          </div>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/" style={{ backgroundColor: "var(--sb-blue)" }} className="inline-flex items-center gap-2 text-sb-cream px-6 py-3 rounded-2xl font-semibold">
            Back to Home
          </Link>
          <button
            onClick={() => { setSubmitted(false); setRefNumber(""); setForm(f => ({ ...f, qty: "", floorLevel: "", address: "", notes: "" })); }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold border border-border text-foreground hover:bg-muted"
          >
            New RFQ
          </button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h2 className="text-foreground font-semibold mb-2">Sign in required</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Concrete RFQ submissions require a StructBay customer account and an active session (same as bulk enquiry).
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: "/rfq" } }}
          style={{ backgroundColor: "var(--sb-blue)" }}
          className="inline-flex items-center gap-2 text-sb-cream px-6 py-3 rounded-2xl font-semibold"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Concrete RFQ</span>
      </nav>

      <div style={{ background: "linear-gradient(135deg, var(--sb-blue) 0%, #2d5fa3 100%)" }} className="rounded-2xl p-6 text-sb-cream mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <h1 className="text-sb-cream">Ready Mix Concrete RFQ</h1>
        </div>
        <p className="text-sb-cream/70">Get instant competitive quotes for Ready Mix Concrete from top suppliers in your city.</p>
        <div className="flex gap-4 mt-3 text-sm text-sb-cream/70">
          <span>✓ Multiple Supplier Quotes</span>
          <span>✓ Best Price Guarantee</span>
          <span>✓ IS Code Certified</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
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
            style={{ backgroundColor: "var(--sb-orange)" }}
            className="w-full py-3.5 rounded-2xl text-sb-cream font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit RFQ — Get Free Quote →"}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            You will receive a reference such as <strong className="text-foreground">RFQCON2606120001</strong> (RFQCON + date + sequence). Our team responds within 2 business hours.
          </p>
        </form>
      </div>
    </div>
  );
}
