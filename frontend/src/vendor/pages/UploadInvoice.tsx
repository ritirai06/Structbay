import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Upload, Send, AlertCircle, CheckCircle, FileText, Download, Eye } from 'lucide-react';
import { api } from '../lib/api';
import { vendorPath } from '../../lib/portalRoutes';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

const MAX_PDF_MB = 10;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

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

function validatePdf(f: File): string | null {
  if (f.type !== 'application/pdf') return 'Only PDF files are allowed.';
  if (f.size > MAX_PDF_BYTES) return `File must be ${MAX_PDF_MB}MB or smaller.`;
  return null;
}

export function UploadInvoice() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [existingInvoice, setExistingInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [vendorRemarks, setVendorRemarks] = useState('');
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [oRes, iRes] = await Promise.allSettled([
          api.getOrder(orderId!),
          api.getInvoiceByOrder(orderId!),
        ]);
        if (oRes.status === 'fulfilled') {
          setOrder(oRes.value.data);
          const lg = oRes.value.data?.structbayLogistics;
          if (lg?.pickupContactName) setPickupContactName(lg.pickupContactName);
          if (lg?.pickupContactPhone) setPickupContactPhone(lg.pickupContactPhone);
        }
        if (iRes.status === 'fulfilled') {
          setExistingInvoice(iRes.value.data);
          if (iRes.value.data?.vendorRemarks) setVendorRemarks(iRes.value.data.vendorRemarks);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [orderId]);

  function selectFile(f: File | null) {
    if (!f) { setFile(null); return; }
    const err = validatePdf(f);
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select an invoice PDF.'); return; }
    const pdfErr = validatePdf(file);
    if (pdfErr) { setError(pdfErr); return; }
    if (order?.deliveryType === 'structbay_delivery' && (!pickupContactName.trim() || !pickupContactPhone.trim())) {
      setError('Pickup contact name and phone are required for StructBay delivery (Type B).');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const form = new FormData();
      form.append('invoice', file);
      form.append('orderId', orderId!);
      if (vendorRemarks.trim()) form.append('vendorRemarks', vendorRemarks.trim());
      if (order?.deliveryType === 'structbay_delivery') {
        form.append('pickupContactName', pickupContactName.trim());
        form.append('pickupContactPhone', pickupContactPhone.trim());
      }

      if (existingInvoice && existingInvoice.status !== 'replaced') {
        await api.replaceInvoice(existingInvoice._id, form);
      } else {
        await api.uploadInvoice(form);
      }
      setSuccess(true);
      setTimeout(() => navigate(vendorPath('orders', orderId!)), 1500);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed. Please try again.');
    } finally { setSubmitting(false); }
  }

  const openExistingPdf = () => {
    if (existingInvoice?.invoiceUrl) {
      window.open(existingInvoice.invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadExistingPdf = async () => {
    if (!existingInvoice?._id) return;
    try {
      const res = await api.downloadInvoice(existingInvoice._id);
      const url = res.data?.downloadUrl || existingInvoice.invoiceUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      if (existingInvoice?.invoiceUrl) window.open(existingInvoice.invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
    </div>
  );

  const isReplace = existingInvoice && existingInvoice.status !== 'replaced';
  const typeB = order?.deliveryType === 'structbay_delivery';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to={vendorPath('orders', orderId!)} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="vendor-page-title" style={{ color: SB.color }}>{isReplace ? 'Replace Invoice' : 'Upload Invoice'}</h1>
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
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">Replacing Existing Invoice</p>
            <p className="text-xs" style={{ color: SB.muted }}>
              Ref: {existingInvoice.invoiceNumber} · Submitted{' '}
              {existingInvoice.submittedAt || existingInvoice.createdAt
                ? new Date(existingInvoice.submittedAt || existingInvoice.createdAt).toLocaleString()
                : '—'}{' '}
              · <span className="capitalize">{existingInvoice.status}</span>
            </p>
            {existingInvoice.invoiceUrl && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={openExistingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}>
                  <Eye className="w-3.5 h-3.5" /> Preview current PDF
                </button>
                <button type="button" onClick={() => void downloadExistingPdf()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}>
                  <Download className="w-3.5 h-3.5" /> Download current PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl p-6" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Upload Invoice PDF" required>
                <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
                  style={{ border: `2px dashed ${file ? 'var(--sb-orange)' : SB.border}`, background: file ? 'var(--sb-orange-subtle)' : SB.bg }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) selectFile(f);
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={e => selectFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <>
                      <FileText className="w-10 h-10" style={{ color: SB.orange }} />
                      <p className="text-sm font-semibold text-center" style={{ color: SB.color }}>{file.name}</p>
                      <p className="text-xs" style={{ color: SB.muted }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10" style={{ color: SB.faint }} />
                      <p className="text-sm font-semibold" style={{ color: SB.color }}>
                        {isReplace ? 'Click to upload replacement PDF' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs" style={{ color: SB.faint }}>PDF only · Max {MAX_PDF_MB}MB</p>
                    </>
                  )}
                </label>
              </Field>

              <Field label="Remarks">
                <textarea
                  value={vendorRemarks}
                  onChange={e => setVendorRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add any notes related to this invoice..."
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>

              {typeB && (
                <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: SB.orange }}>
                    Pickup contact (Type B — StructBay delivery)
                  </p>
                  <p className="text-xs" style={{ color: SB.muted }}>
                    StructBay will use this contact when booking Porter/Delhivery pickup from your warehouse.
                  </p>
                  <Field label="Contact name" required>
                    <input type="text" value={pickupContactName} onChange={e => setPickupContactName(e.target.value)} required
                      placeholder="Warehouse / dispatch person" className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Contact phone" required>
                    <input type="tel" value={pickupContactPhone} onChange={e => setPickupContactPhone(e.target.value)} required
                      placeholder="10-digit mobile" className={inputCls} style={inputStyle} />
                  </Field>
                </div>
              )}

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

        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <h3 className="vendor-section-title mb-4" style={{ color: SB.muted }}>Order Summary</h3>
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
            <h3 className="vendor-section-title mb-3" style={{ color: SB.muted }}>Invoice Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${order?.invoiceStatus === 'pending' ? 'bg-red-400' : 'bg-yellow-400'}`} />
              <span className="text-sm capitalize" style={{ color: SB.color }}>{order?.invoiceStatus ?? 'Pending Upload'}</span>
            </div>
            <p className="text-xs mt-2" style={{ color: SB.faint }}>
              Upload your GST tax invoice PDF. StructBay will review the document directly — no manual amount entry needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
