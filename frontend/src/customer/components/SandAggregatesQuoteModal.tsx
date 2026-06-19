import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

type QuoteLine = {
  size: string;
  quantity: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const SIZE_OPTIONS = [
  "M Sand",
  "P Sand",
  "12mm Aggregate",
  "20mm Aggregate",
  "40mm Aggregate",
  "GSB",
  "WMM",
];

const fieldClass =
  "w-full h-11 border border-gray-300 bg-white px-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#E85A00]";

export function SandAggregatesQuoteModal({ open, onClose }: Props) {
  const { user, isLoggedIn } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: isLoggedIn ? user?.name || "" : "",
    company: isLoggedIn ? user?.company || "" : "",
    phone: "",
    siteAddress: "",
  });
  const [lines, setLines] = useState<QuoteLine[]>([{ size: "", quantity: "" }]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user?.name || "",
      company: prev.company || user?.company || "",
    }));
  }, [open, user?.name, user?.company]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateLine = (index: number, key: keyof QuoteLine, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { size: "", quantity: "" }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const reset = () => {
    setSubmitted(false);
    setRefNumber("");
    setError("");
    setForm({
      name: user?.name || "",
      company: user?.company || "",
      phone: "",
      siteAddress: "",
    });
    setLines([{ size: "", quantity: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanLines = lines
      .map((line) => ({ size: line.size.trim(), quantity: line.quantity.trim() }))
      .filter((line) => line.size || line.quantity);

    if (!form.name.trim() || !form.phone.trim() || !form.siteAddress.trim()) {
      setError("Name, phone number, and site address are required.");
      return;
    }
    if (!cleanLines.length || cleanLines.some((line) => !line.size || !line.quantity)) {
      setError("Please select size and quantity for each product row.");
      return;
    }

    setLoading(true);
    try {
      const requirement = cleanLines
        .map((line, index) => `Product ${index + 1}: ${line.size} - ${line.quantity} MT`)
        .join("\n");
      const res = await api.submitBulkEnquiry({
        quoteType: "SAND_AGGREGATES",
        customerName: form.name,
        customerPhone: form.phone,
        companyName: form.company || undefined,
        deliveryAddress: form.siteAddress,
        city: form.siteAddress,
        requirement: `M Sand & Aggregates quote request\n${requirement}`,
        remarks: "Submitted from M Sand & Aggregates category popup.",
        attachments: [],
      });
      setRefNumber(res.data?.enquiryNumber || "");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit quote request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[760px] max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sand-aggregates-quote-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-black"
          aria-label="Close quote form"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="px-6 py-12 text-center sm:px-10">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
            <h2 className="mb-2 text-2xl font-bold text-black">Quote request submitted</h2>
            <p className="mb-5 text-sm text-gray-600">Our team will contact you with pricing for M Sand & Aggregates.</p>
            {refNumber && (
              <p className="mb-6 inline-block border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm font-bold text-[#E85A00]">
                {refNumber}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button type="button" onClick={onClose} className="rounded-lg bg-black px-6 py-3 text-sm font-bold text-white">
                Close
              </button>
              <button type="button" onClick={reset} className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-bold text-black">
                New quote
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-10">
            <h2 id="sand-aggregates-quote-title" className="mb-8 text-3xl font-black text-black">
              M Sand & Aggregates
            </h2>

            <div className="mx-auto max-w-[560px] space-y-4 rounded-xl border border-gray-100 bg-white p-4 sm:p-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Name</span>
                <input className={fieldClass} value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Company Name</span>
                <input className={fieldClass} value={form.company} onChange={(e) => updateForm("company", e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Phone Number</span>
                <input className={fieldClass} value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Site Address</span>
                <input className={fieldClass} value={form.siteAddress} onChange={(e) => updateForm("siteAddress", e.target.value)} />
              </label>

              <div className="pt-4">
                {lines.map((line, index) => (
                  <div key={index} className="mb-3 rounded-xl bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-600">Product {index + 1}</p>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(index)} className="text-gray-400 hover:text-red-500" aria-label="Remove product row">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr]">
                      <select className={fieldClass} value={line.size} onChange={(e) => updateLine(index, "size", e.target.value)}>
                        <option value="">Select Size</option>
                        {SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <input
                        className={fieldClass}
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", e.target.value)}
                        placeholder="Qty (MT)"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addLine}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-pink-400 py-3 text-sm font-black uppercase tracking-wide text-pink-500 hover:bg-pink-50"
                >
                  <Plus className="h-4 w-4" /> Add more sizes
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-black py-4 text-sm font-black uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit all quotes"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
