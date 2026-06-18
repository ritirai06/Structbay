import { useEffect, useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  MapPin,
  MessageSquare,
  User,
  Package,
  Check,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import {
  BULK_ENQUIRY_TEXT_EXAMPLE,
  downloadBulkEnquiryTemplate,
} from "../lib/bulkEnquiryTemplate";

const fieldClass =
  "w-full border border-[#d4d4d4] rounded-none px-3 py-2.5 text-sm bg-white text-black focus:outline-none focus:border-[#E85A00]";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BulkEnquiryModal({ open, onClose }: Props) {
  const { user, isLoggedIn } = useApp();
  const panelRef = useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: isLoggedIn ? user?.name || "" : "",
    company: isLoggedIn ? user?.company || "" : "",
    email: isLoggedIn ? user?.email || "" : "",
    mobile: "",
    address: "",
    city: "",
    requirement: "",
    remarks: "",
  });

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && isLoggedIn) {
      setForm((f) => ({
        ...f,
        name: f.name || user?.name || "",
        company: f.company || user?.company || "",
        email: f.email || user?.email || "",
      }));
    }
  }, [open, isLoggedIn, user?.name, user?.company, user?.email]);

  if (!open) return null;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const getFileIcon = (file: File) => {
    if (file.type.includes("image")) return <ImageIcon className="w-4 h-4 text-[#E85A00]" />;
    if (file.name.match(/\.(xlsx|csv|xls)$/)) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    return <FileText className="w-4 h-4 text-[#E85A00]" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.requirement.trim() && files.length === 0) {
      setError("Please provide either requirement details or upload a document.");
      return;
    }

    setLoading(true);
    try {
      const attachments: { name: string; url: string; publicId?: string }[] = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} exceeds 10MB limit.`);
        }
        const up = await api.uploadEnquiryDocument(file);
        const url = up?.data?.url;
        if (!url) throw new Error(`Failed to upload ${file.name}`);
        attachments.push({ name: file.name, url, publicId: up.data?.publicId });
      }

      const res = await api.submitBulkEnquiry({
        customerName: form.name,
        customerPhone: form.mobile,
        customerEmail: form.email || undefined,
        companyName: form.company || undefined,
        deliveryAddress: form.address || undefined,
        city: form.city || undefined,
        requirement: form.requirement || "See attached document",
        remarks: form.remarks || undefined,
        attachments,
      });
      setRefNumber(res.data?.enquiryNumber || "");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFiles([]);
    setRefNumber("");
    setError("");
    setForm({
      name: user?.name || "",
      company: user?.company || "",
      email: user?.email || "",
      mobile: "",
      address: "",
      city: "",
      requirement: "",
      remarks: "",
    });
  };

  return (
    <div
      className="sf-bulk-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="sf-bulk-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-enquiry-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="sf-bulk-modal-close"
          aria-label="Close bulk enquiry"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="sf-bulk-modal-body text-center py-12 px-6">
            <div className="w-14 h-14 bg-green-600 flex items-center justify-center mx-auto mb-4 rounded-none">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-black mb-2">Bulk enquiry submitted</h2>
            <p className="text-sm text-gray-600 mb-4">
              Our team will reach out within <strong>4 business hours</strong> with a quotation.
            </p>
            {refNumber && (
              <div className="border border-gray-200 bg-gray-50 px-4 py-3 mb-6 inline-block rounded-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reference</p>
                <p className="text-lg font-black text-[#E85A00] font-mono">{refNumber}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={onClose} className="sf-bulk-modal-submit">
                Close
              </button>
              <button type="button" onClick={resetForm} className="sf-bulk-modal-secondary">
                New enquiry
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="sf-bulk-modal-hero">
              <div className="flex items-start gap-3 pr-8">
                <div className="w-10 h-10 border border-white/30 flex items-center justify-center shrink-0 rounded-none bg-white/10">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 id="bulk-enquiry-title" className="text-base font-extrabold uppercase tracking-wide text-white">
                    Bulk order enquiry
                  </h2>
                  <p className="text-sm text-white/85 mt-1 leading-snug">
                    For orders above 100 MT or ₹5 Lakh. Dedicated account management and B2B pricing.
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
                    {["Dedicated account manager", "Best bulk pricing", "Credit terms available"].map((label) => (
                      <li key={label} className="inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="sf-bulk-modal-body">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 rounded-none">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Full name *</span>
                    </label>
                    <input value={form.name} onChange={(e) => update("name", e.target.value)} required className={fieldClass} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Company</span>
                    </label>
                    <input value={form.company} onChange={(e) => update("company", e.target.value)} className={fieldClass} placeholder="Your company" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                    </label>
                    <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={fieldClass} placeholder="email@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Mobile *</span>
                    </label>
                    <input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} required className={fieldClass} placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Delivery city</span>
                    </label>
                    <input value={form.city} onChange={(e) => update("city", e.target.value)} className={fieldClass} placeholder="e.g. Bengaluru" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Delivery address</label>
                    <input value={form.address} onChange={(e) => update("address", e.target.value)} className={fieldClass} placeholder="Site / delivery address" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                    <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Requirement details</span>
                  </label>
                  <textarea
                    value={form.requirement}
                    onChange={(e) => update("requirement", e.target.value)}
                    rows={4}
                    className={`${fieldClass} resize-none`}
                    placeholder={'e.g.\nUltratech Cement OPC 53 Grade — 500 bags\nAsian Paints Apex Ultima — 120 buckets'}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <p className="text-xs text-gray-500">Requirement text or a document upload is required.</p>
                    <button
                      type="button"
                      onClick={() => update("requirement", BULK_ENQUIRY_TEXT_EXAMPLE)}
                      className="text-xs font-semibold text-[#E85A00] hover:underline"
                    >
                      Use example text
                    </button>
                  </div>
                </div>

                <div className="sf-bulk-template-strip">
                  <p className="sf-bulk-template-strip__title">Sample templates</p>
                  <p className="sf-bulk-template-strip__hint">
                    Download, fill your product lines, and upload below — or use the example text above.
                  </p>
                  <div className="sf-bulk-template-strip__actions">
                    <button
                      type="button"
                      onClick={() => downloadBulkEnquiryTemplate("excel")}
                      className="sf-bulk-template-strip__btn"
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden />
                      Excel template
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadBulkEnquiryTemplate("pdf")}
                      className="sf-bulk-template-strip__btn"
                    >
                      <FileText className="w-4 h-4 shrink-0" aria-hidden />
                      PDF template
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Upload documents</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-[#E85A00] transition-colors rounded-none"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Drop files or click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, Excel, images — max 10MB each</p>
                    <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.csv,.xls,.jpg,.jpeg,.png" onChange={handleFiles} className="hidden" />
                  </div>
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-3 py-2 rounded-none">
                          {getFileIcon(file)}
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</span>
                          <button type="button" onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Additional remarks</label>
                  <textarea
                    value={form.remarks}
                    onChange={(e) => update("remarks", e.target.value)}
                    rows={2}
                    className={`${fieldClass} resize-none`}
                    placeholder="Preferred brands, special instructions..."
                  />
                </div>

                <button type="submit" disabled={loading} className="sf-bulk-modal-submit w-full">
                  {loading ? "Submitting..." : "Submit bulk enquiry"}
                </button>
                <p className="text-xs text-center text-gray-500">Response within 4 business hours with a reference number.</p>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
