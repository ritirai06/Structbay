import { useState, useRef } from "react";
import { Link } from "react-router";
import { ChevronRight, Upload, CheckCircle2, X, FileSpreadsheet, Image, FileText } from "lucide-react";

export function BulkEnquiry() {
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ name: "", company: "", email: "", mobile: "", address: "", details: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const getFileIcon = (file: File) => {
    if (file.type.includes("image")) return <Image className="w-4 h-4" style={{ color: "var(--sb-blue)" }} />;
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) return <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--sb-green, #16a34a)" }} />;
    return <FileText className="w-4 h-4" style={{ color: "var(--sb-orange)" }} />;
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div style={{ backgroundColor: "var(--sb-green, #16a34a)" }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-foreground mb-2">Bulk Enquiry Submitted!</h2>
        <p className="text-muted-foreground mb-6">Our bulk procurement team will reach out within 4 business hours with a detailed quotation.</p>
        <Link to="/" style={{ backgroundColor: "var(--sb-blue)" }} className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-semibold">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Bulk Enquiry</span>
      </nav>

      <div style={{ background: "linear-gradient(135deg, var(--sb-orange) 0%, #f97316 100%)" }} className="rounded-2xl p-6 text-white mb-6">
        <h1 className="text-white mb-2">Bulk Order Enquiry</h1>
        <p className="text-white/80">For orders above 100 MT or ₹5 Lakh. Get dedicated account management and exclusive pricing.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {[["Name *", "name", "Full name"], ["Company *", "company", "Company name"], ["Email *", "email", "Email address"], ["Mobile *", "mobile", "+91 98765 43210"]].map(([label, key, ph]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e => update(key, e.target.value)} placeholder={ph} required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Delivery Address *</label>
            <textarea value={form.address} onChange={e => update("address", e.target.value)} placeholder="Full site/delivery address" rows={2} required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Requirement Details *</label>
            <textarea value={form.details} onChange={e => update("details", e.target.value)} placeholder="Describe your material requirements (product, grade, quantity, timeline...)" rows={4} required className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none resize-none" />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Upload Documents (Optional)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Drop files or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Excel, Images supported (Max 10MB each)</p>
              <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png" onChange={handleFiles} className="hidden" />
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted rounded-xl px-3 py-2">
                    {getFileIcon(file)}
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)}KB</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" style={{ backgroundColor: "var(--sb-blue)" }} className="w-full py-3.5 rounded-2xl text-white font-semibold hover:opacity-90 transition-opacity">
            Submit Bulk Enquiry
          </button>
        </form>
      </div>
    </div>
  );
}
