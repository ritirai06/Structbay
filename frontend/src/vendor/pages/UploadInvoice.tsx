import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Upload, Send, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { api } from '../lib/api';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: SB.muted }}>
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all';
const inputStyle = { background: 'var(--sb-bg-section)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' };

export function UploadInvoice() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [existingInvoice, setExistingInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [gstAmount, setGstAmount] = useState('');
  const [vendorRemarks, setVendorRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const total = (parseFloat(invoiceAmount || '0') + parseFloat(gstAmount || '0')).toFixed(2);

  useEffect(() => {
    async function load() {
      try {
        const [oRes, iRes] = await Promise.allSettled([
          api.getOrder(orderId!),
          api.getInvoiceByOrder(orderId!),
        ]);
        if (oRes.status === 'fulfilled') setOrder(oRes.value.data);
        if (iRes.status === 'fulfilled') setExistingInvoice(iRes.value.data);
      } finally { setLoading(false); }
    }
    load();
  }, [orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select an invoice PDF.'); return; }
    setSubmitting(true); setError('');
    try {
      const form = new FormData();
      form.append('invoice', file);
      form.append('orderId', orderId!);
      form.append('invoiceNumber', invoiceNumber);
      form.append('invoiceDate', invoiceDate);
      form.append('invoiceAmount', invoiceAmount);
      form.append('gstAmount', gstAmount);
      form.append('vendorRemarks', vendorRemarks);

      if (existingInvoice && existingInvoice.status !== 'replaced') {
        await api.replaceInvoice(existingInvoice._id, form);
      } else {
        await api.uploadInvoice(form);
      }
      setSuccess(true);
      setTimeout(() => navigate(`/orders/${orderId}`), 1500);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed. Please try again.');
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
    </div>
  );

  const isReplace = existingInvoice && existingInvoice.status !== 'replaced';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/orders/${orderId}`} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black" style={{ color: SB.color }}>{isReplace ? 'Replace Invoice' : 'Upload Invoice'}</h1>
          <p className="text-sm" style={{ color: SB.muted }}>Order: {order?.orderNumber ?? orderId}</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-sm font-semibold text-green-400">Invoice {isReplace ? 'replaced' : 'uploaded'} successfully! Redirecting...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {isReplace && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">Replacing Existing Invoice</p>
            <p className="text-xs" style={{ color: SB.muted }}>
              Current: {existingInvoice.invoiceNumber} · ₹{existingInvoice.totalAmount?.toLocaleString('en-IN')} ·{' '}
              <span className="capitalize">{existingInvoice.status}</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl p-6" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Invoice Number" required>
                <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required
                  placeholder="INV-2025-001" className={inputCls} style={inputStyle} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Invoice Date" required>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required
                    className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Invoice Amount (₹)" required>
                  <input type="number" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} required
                    placeholder="0.00" min="0" step="0.01" className={inputCls} style={inputStyle} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="GST Amount (₹)" required>
                  <input type="number" value={gstAmount} onChange={e => setGstAmount(e.target.value)} required
                    placeholder="0.00" min="0" step="0.01" className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Total Amount (₹)">
                  <input type="text" value={total} readOnly className={inputCls}
                    style={{ ...inputStyle, background: 'var(--sb-bg)', opacity: 0.7 }} />
                </Field>
              </div>

              <Field label="Upload Invoice PDF" required>
                <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
                  style={{ border: `2px dashed ${file ? 'var(--sb-orange)' : SB.border}`, background: file ? 'var(--sb-orange-subtle)' : SB.bg }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); }}
                >
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  {file ? (
                    <>
                      <FileText className="w-10 h-10" style={{ color: SB.orange }} />
                      <p className="text-sm font-semibold text-center" style={{ color: SB.color }}>{file.name}</p>
                      <p className="text-xs" style={{ color: SB.muted }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10" style={{ color: SB.faint }} />
                      <p className="text-sm font-semibold" style={{ color: SB.color }}>Click to upload or drag and drop</p>
                      <p className="text-xs" style={{ color: SB.faint }}>PDF only · Max 10MB</p>
                    </>
                  )}
                </label>
              </Field>

              <Field label="Remarks">
                <textarea value={vendorRemarks} onChange={e => setVendorRemarks(e.target.value)}
                  rows={3} placeholder="Any remarks about this invoice..."
                  className={inputCls} style={inputStyle} />
              </Field>

              <button type="submit" disabled={submitting || success}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                style={{ background: 'var(--sb-orange)', color: '#0D0D0D', boxShadow: '0 4px 16px var(--sb-orange-glow)' }}>
                {submitting
                  ? <><div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> Uploading...</>
                  : <><Send className="w-4 h-4" /> {isReplace ? 'Replace Invoice' : 'Submit Invoice'}</>
                }
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SB.muted }}>Order Summary</h3>
            <div className="space-y-3">
              {[
                ['Order #', order?.orderNumber],
                ['Product', order?.assignedProducts?.[0]?.productName],
                ['Quantity', `${order?.assignedProducts?.[0]?.quantity ?? '—'} ${order?.assignedProducts?.[0]?.unit ?? ''}`],
                ['Customer', order?.customer?.name],
                ['City', order?.deliveryAddress?.city],
                ['Order Total', order?.totalAmount ? `₹${order.totalAmount.toLocaleString('en-IN')}` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: SB.faint }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: SB.color }}>{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: SB.muted }}>Invoice Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${order?.invoiceStatus === 'pending' ? 'bg-red-400' : 'bg-yellow-400'}`} />
              <span className="text-sm capitalize" style={{ color: SB.color }}>{order?.invoiceStatus ?? 'Pending Upload'}</span>
            </div>
            <p className="text-xs mt-2" style={{ color: SB.faint }}>
              Once submitted, StructBay will review your invoice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
