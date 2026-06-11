import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, CheckCircle, AlertCircle, Truck } from 'lucide-react';
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

export function ReadyDispatch() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dispatch form
  const [dispatchType, setDispatchType] = useState<'vendor_delivery' | 'structbay_pickup'>('vendor_delivery');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    api.getOrder(orderId!)
      .then(r => {
        setOrder(r.data);
        // Pre-set dispatch type based on delivery type
        if (r.data.deliveryType === 'structbay_delivery') setDispatchType('structbay_pickup');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      const body: Record<string, unknown> = {
        orderId, dispatchType, dispatchDate, expectedDeliveryDate: expectedDelivery, dispatchRemarks: remarks,
      };
      if (dispatchType === 'vendor_delivery') {
        Object.assign(body, { vehicleNumber, vehicleType, driverName, driverPhone });
      } else {
        Object.assign(body, { pickupAddress, contactPerson, contactNumber, pickupTime });
      }
      await api.createDispatch(body);
      setMsg({ type: 'success', text: 'Dispatch created! Order marked Ready for Dispatch.' });
      setTimeout(() => navigate(vendorPath('orders', orderId!)), 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Failed to create dispatch.' });
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
      <p className="font-semibold" style={{ color: SB.muted }}>Order not found</p>
      <Link to={vendorPath('orders')} className="mt-4 text-sm font-semibold" style={{ color: SB.orange }}>← Back to Orders</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to={vendorPath('orders', orderId!)} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black" style={{ color: SB.color }}>Mark Ready for Dispatch</h1>
          <p className="text-sm" style={{ color: SB.muted }}>Order: {order.orderNumber}</p>
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
              <Field label="Delivery Type" required>
                <select value={dispatchType} onChange={e => setDispatchType(e.target.value as any)}
                  className={inputCls} style={inputStyle}
                  disabled={order.deliveryType === 'structbay_delivery'}>
                  <option value="vendor_delivery">Vendor Self Delivery</option>
                  <option value="structbay_pickup">StructBay Pickup</option>
                </select>
              </Field>

              {dispatchType === 'vendor_delivery' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Vehicle Number" required>
                      <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)}
                        required placeholder="MH-12-AB-1234" className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Vehicle Type">
                      <input type="text" value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                        placeholder="Truck / Tempo / Mini Truck" className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Driver Name" required>
                      <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
                        required placeholder="Full name" className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Driver Phone">
                      <input type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX" className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Pickup / Warehouse Address" required>
                    <textarea value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
                      required rows={3} placeholder="Complete warehouse address with pincode"
                      className={inputCls} style={inputStyle} />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Contact Person" required>
                      <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                        required placeholder="Person at pickup location" className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Contact Phone" required>
                      <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                        required placeholder="+91 XXXXX XXXXX" className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                  <Field label="Pickup Availability" required>
                    <input type="text" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                      required placeholder="e.g. 9:00 AM – 6:00 PM, Monday–Saturday"
                      className={inputCls} style={inputStyle} />
                  </Field>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Dispatch Date" required>
                  <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)}
                    required className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Expected Delivery Date">
                  <input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </Field>
              </div>

              <Field label="Remarks">
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
                  placeholder="Special handling instructions, notes for StructBay..."
                  className={inputCls} style={inputStyle} />
              </Field>

              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
                <Truck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
                <p className="text-xs" style={{ color: SB.muted }}>
                  {dispatchType === 'structbay_pickup'
                    ? 'StructBay logistics team will schedule pickup from your warehouse within 24–48 hours after you submit.'
                    : 'After submitting, the order status will be updated to "Ready for Dispatch" and StructBay admin will be notified.'}
                </p>
              </div>

              <button type="submit" disabled={submitting || !!msg && msg.type === 'success'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                {submitting
                  ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Mark Ready for Dispatch'}
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SB.muted }}>Order Summary</h3>
            <div className="space-y-3">
              {[
                ['Order #', order.orderNumber],
                ['Product', order.assignedProducts?.[0]?.productName ?? '—'],
                ['Quantity', `${order.assignedProducts?.[0]?.quantity ?? '—'} ${order.assignedProducts?.[0]?.unit ?? ''}`],
                ['Customer', order.customer?.name ?? '—'],
                ['Delivery City', order.deliveryAddress?.city ?? '—'],
                ['Delivery Type', order.deliveryType === 'structbay_delivery' ? 'StructBay Delivery' : 'Vendor Delivery'],
                ['Invoice Status', order.invoiceStatus],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center text-xs">
                  <span style={{ color: SB.faint }}>{l}</span>
                  <span className="font-semibold capitalize" style={{ color: SB.color }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {order.dispatchInstructions && (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SB.orange }}>Dispatch Instructions</p>
                <p className="text-xs" style={{ color: SB.muted }}>{order.dispatchInstructions}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
