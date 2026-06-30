import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Send, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { vendorPath } from '../../lib/portalRoutes';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all';
const inputStyle = { background: 'var(--sb-bg-section)', border: '1px solid var(--sb-border)', color: 'var(--sb-text-primary)' };

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

export function WarehouseDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [existingDispatch, setExistingDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pickupAddress, setPickupAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [oRes, dRes] = await Promise.allSettled([
          api.getOrder(orderId!),
          api.getDispatchByOrder(orderId!),
        ]);
        if (oRes.status === 'fulfilled') setOrder(oRes.value.data);
        if (dRes.status === 'fulfilled') {
          const d = dRes.value.data;
          setExistingDispatch(d);
          if (d.pickupDetails) {
            setPickupAddress(d.pickupDetails.pickupAddress ?? '');
            setContactPerson(d.pickupDetails.contactPerson ?? '');
            setContactNumber(d.pickupDetails.contactNumber ?? '');
          }
        }
      } finally { setLoading(false); }
    }
    load();
  }, [orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      if (existingDispatch) {
        // Update status only if dispatch exists
        await api.updateDispatchStatus(existingDispatch._id, {
          status: 'ready_for_dispatch',
          remarks: instructions,
        });
      } else {
        await api.createDispatch({
          orderId,
          dispatchType: 'structbay_pickup',
          pickupAddress,
          contactPerson,
          contactNumber,
          pickupTime: pickupTime || undefined,
          dispatchDate: dispatchDate || undefined,
          dispatchRemarks: instructions,
        });
      }
      setMsg({ type: 'success', text: 'Pickup details submitted! Structbay will schedule collection shortly.' });
      setTimeout(() => navigate(vendorPath('orders', orderId!)), 1800);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Submission failed.' });
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center py-20">
      <AlertCircle className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
      <p style={{ color: SB.muted }}>Order not found</p>
      <Link to={vendorPath('orders')} className="mt-4 text-sm font-semibold" style={{ color: SB.orange }}>← Back</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to={vendorPath('orders', orderId!)} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="vendor-page-title" style={{ color: SB.color }}>Pickup / Warehouse Details</h1>
          <p className="text-sm" style={{ color: SB.muted }}>Order: {order.orderNumber} · Structbay Pickup</p>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className={`text-sm font-medium ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Warehouse / Pickup Address" required>
                <textarea value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
                  required rows={3} placeholder="Complete warehouse address with pincode"
                  className={inputCls} style={inputStyle} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Contact Person Name" required>
                  <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                    required placeholder="Person available for pickup" className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Mobile Number" required>
                  <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                    required placeholder="+91 XXXXX XXXXX" className={inputCls} style={inputStyle} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Alternate Mobile">
                  <input type="tel" value={altPhone} onChange={e => setAltPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX (optional)" className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Pickup Availability" required>
                  <input type="text" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                    required placeholder="e.g. 9:00 AM – 6:00 PM" className={inputCls} style={inputStyle} />
                </Field>
              </div>

              <Field label="Material Ready Date">
                <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>

              <Field label="Loading / Special Instructions">
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3}
                  placeholder="Loading dock info, access details, forklift required, parking, etc."
                  className={inputCls} style={inputStyle} />
              </Field>

              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
                <p className="text-xs" style={{ color: SB.muted }}>
                  Structbay logistics team (Porter / Delhivery / 3PL) will coordinate with your contact person for material collection within 24–48 hours.
                </p>
              </div>

              <button type="submit" disabled={submitting || (!!msg && msg.type === 'success')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                {submitting
                  ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" />
                  : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : existingDispatch ? 'Update Pickup Details' : 'Submit Pickup Details'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <h3 className="vendor-section-title mb-4" style={{ color: SB.muted }}>Order Summary</h3>
            <div className="space-y-3">
              {[
                ['Order #', order.orderNumber],
                ['Product', order.assignedProducts?.[0]?.productName ?? '—'],
                ['Quantity', `${order.assignedProducts?.[0]?.quantity ?? '—'} ${order.assignedProducts?.[0]?.unit ?? ''}`],
                ['Customer City', order.deliveryAddress?.city ?? '—'],
                ['Invoice', order.invoiceStatus],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs">
                  <span style={{ color: SB.faint }}>{l}</span>
                  <span className="font-semibold capitalize" style={{ color: SB.color }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {existingDispatch && (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
              <div>
                <p className="text-xs font-bold text-green-400 mb-1">Dispatch Already Created</p>
                <p className="text-xs" style={{ color: SB.muted }}>You can update pickup details below.</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.faint }} />
            <p className="text-xs" style={{ color: SB.faint }}>
              Please ensure the contact person is reachable and material is ready before submitting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
