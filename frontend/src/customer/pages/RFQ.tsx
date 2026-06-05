import { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, FileText, CheckCircle2 } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export function RFQ() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", grade: "M25", qty: "", floor: "", address: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div style={{ backgroundColor: "var(--sb-green, #16a34a)" }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-foreground mb-2">RFQ Submitted Successfully!</h2>
        <p className="text-muted-foreground mb-6">Our concrete procurement team will contact you within 2 business hours with the best quote.</p>
        <Link to="/" style={{ backgroundColor: "var(--sb-blue)" }} className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-semibold">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Request for Quote</span>
      </nav>

      <div style={{ background: "linear-gradient(135deg, var(--sb-blue) 0%, var(--sb-blue-light, #2d5fa3) 100%)" }} className="rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <h1 className="text-white">Concrete RFQ</h1>
        </div>
        <p className="text-white/70">Get instant competitive quotes for Ready Mix Concrete from top suppliers in your city.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your Name *</label>
              <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Full name" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Company Name *</label>
              <input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Company name" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number *</label>
              <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Concrete Grade *</label>
              <select value={form.grade} onChange={e => update("grade", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none">
                {["M20", "M25", "M30", "M35", "M40", "M45"].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Quantity (Cubic Metres) *</label>
              <input type="number" value={form.qty} onChange={e => update("qty", e.target.value)} placeholder="e.g. 50" required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Floor Level</label>
              <select value={form.floor} onChange={e => update("floor", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none">
                <option value="">Select floor</option>
                {["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th+ Floor"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Site Address *</label>
            <textarea value={form.address} onChange={e => update("address", e.target.value)} placeholder="Full site address with pincode" rows={3} required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none resize-none" />
          </div>
          <button type="submit" style={{ backgroundColor: "var(--sb-orange)" }} className="w-full py-3.5 rounded-2xl text-white font-semibold hover:opacity-90 transition-opacity">
            Submit RFQ — Get Free Quote
          </button>
        </form>
      </div>
    </div>
  );
}
