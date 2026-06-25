import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Phone,
  Building2,
  MapPin,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getApiV1Base } from "../../lib/apiBase";
import { getCustomerAccessToken } from "../lib/authStorage";
import { useScrollLock } from "../hooks/useScrollLock";

const GRADES = ["M20", "M25", "M30", "M35", "M40", "M45", "M50"];
const GRADE_LABELS: Record<string, string> = {
  M20: "Light Structural",
  M25: "General Structural",
  M30: "Bridges / Heavy",
  M35: "High Strength",
  M40: "Very High Strength",
};
const FLOORS = [
  "Ground Floor",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "5th Floor",
  "Above 5th Floor",
];

type Props = {
  open: boolean;
  onClose: () => void;
};

const fieldClass =
  "w-full border border-gray-300 bg-white rounded-xl px-3 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E85A00]/30 focus:border-[#E85A00]";

export function ConcreteRFQModal({ open, onClose }: Props) {
  const { user, isLoggedIn } = useApp();

  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: isLoggedIn ? user?.name || "" : "",
    company: isLoggedIn ? user?.company || "" : "",
    phone: "",
    email: isLoggedIn ? user?.email || "" : "",
    grade: "M25",
    qty: "",
    floorLevel: "",
    pumpRequired: false,
    address: "",
    city: "",
    deliveryDate: "",
    notes: "",
  });

  useScrollLock(open);

  // Pre-fill user details when modal opens
  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user?.name || "",
      company: prev.company || user?.company || "",
      email: prev.email || user?.email || "",
    }));
  }, [open, user?.name, user?.company, user?.email]);

  // ESC key closes modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const update = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setSubmitted(false);
    setRefNumber("");
    setError("");
    setForm({
      name: user?.name || "",
      company: user?.company || "",
      phone: "",
      email: user?.email || "",
      grade: "M25",
      qty: "",
      floorLevel: "",
      pumpRequired: false,
      address: "",
      city: "",
      deliveryDate: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email || undefined,
        companyName: form.company || undefined,
        grade: form.grade,
        quantity: Number(form.qty),
        floorLevel: form.floorLevel || undefined,
        pumpRequired: form.pumpRequired,
        location: form.address,
        siteAddress: form.address,
        city: form.city,
        deliveryDate: form.deliveryDate || undefined,
        notes: form.notes || undefined,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
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
      setError(
        err instanceof Error ? err.message : "Could not submit RFQ. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/55 px-4 py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[760px] max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="concrete-rfq-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-black"
          aria-label="Close RFQ form"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Success state */}
        {submitted ? (
          <div className="px-6 py-12 text-center sm:px-10">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
            <h2 className="mb-2 text-2xl font-bold text-black">
              RFQ submitted successfully
            </h2>
            <p className="mb-5 text-sm text-gray-600">
              Our concrete procurement team will contact you within{" "}
              <strong>2 business hours</strong> with a competitive quote.
            </p>
            {refNumber && (
              <p className="mb-6 inline-block border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm font-bold text-[#E85A00]">
                {refNumber}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-black px-6 py-3 text-sm font-bold text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-bold text-black"
              >
                New RFQ
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-10">
            {/* Header */}
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85A00]/15 border border-[#E85A00]/20">
                <FileText className="h-5 w-5 text-[#E85A00]" />
              </div>
              <div>
                <h2
                  id="concrete-rfq-modal-title"
                  className="text-2xl font-black text-black leading-tight"
                >
                  Ready Mix Concrete RFQ
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Get competitive quotes from top suppliers in your city.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-[640px] space-y-4 rounded-xl border border-gray-100 bg-white p-4 sm:p-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Name + Company */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Your Name *
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Full name"
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Building2 className="h-3.5 w-3.5" /> Company Name *
                  </span>
                  <input
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Company / contractor name"
                    required
                    className={fieldClass}
                  />
                </label>
              </div>

              {/* Phone + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Phone className="h-3.5 w-3.5" /> Phone Number *
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="email@company.com"
                    className={fieldClass}
                  />
                </label>
              </div>

              {/* Grade + Quantity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Concrete Grade *
                  </span>
                  <select
                    value={form.grade}
                    onChange={(e) => update("grade", e.target.value)}
                    className={fieldClass}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                        {GRADE_LABELS[g] ? ` – ${GRADE_LABELS[g]}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Quantity (Cubic Metres) *
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => update("qty", e.target.value)}
                    placeholder="e.g. 50"
                    required
                    className={fieldClass}
                  />
                </label>
              </div>

              {/* Floor Level + City */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Floor Level of Concreting
                  </span>
                  <select
                    value={form.floorLevel}
                    onChange={(e) => update("floorLevel", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select floor level</option>
                    {FLOORS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <MapPin className="h-3.5 w-3.5" /> City *
                  </span>
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="e.g. Bengaluru"
                    required
                    className={fieldClass}
                  />
                </label>
              </div>

              {/* Delivery Date */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Required Delivery Date
                </span>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => update("deliveryDate", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={fieldClass}
                />
              </label>

              {/* Site Address */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Site Address *
                </span>
                <textarea
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Full site address with landmark and pincode"
                  rows={2}
                  required
                  className={`${fieldClass} resize-none`}
                />
              </label>

              {/* Pump required checkbox */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.pumpRequired}
                  onChange={(e) => update("pumpRequired", e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-gray-700">
                  Concrete pump required at site
                </span>
              </label>

              {/* Additional Notes */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Additional Requirements
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Any special requirements, admixtures, site access notes..."
                  rows={2}
                  className={`${fieldClass} resize-none`}
                />
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-black py-4 text-sm font-black uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit RFQ — Get Free Quote"}
              </button>

              <p className="text-center text-xs text-gray-400">
                Our team responds within{" "}
                <strong className="text-gray-600">2 business hours</strong>.
                Multiple supplier quotes guaranteed.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
