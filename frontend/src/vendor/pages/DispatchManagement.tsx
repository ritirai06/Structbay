import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Truck, Calendar, User, Phone, Upload, CheckCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
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

const DISPATCH_STATUSES = [
  { value: 'ready_for_dispatch', label: 'Ready for Dispatch' },
  { value: 'dispatched',         label: 'Dispatched' },
  { value: 'in_transit',         label: 'In Transit' },
  { value: 'out_for_delivery',   label: 'Out for Delivery' },
  { value: 'delivered',          label: 'Delivered' },
];

export function DispatchManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [existingDispatch, setExistingDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tab, setTab] = useState<'create' | 'update' | 'proof'>('create');

  // Create dispatch fields
  const [dispatchType, setDispatchType] = useState<'vendor_delivery' | 'structbay_pickup'>('vendor_delivery');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupContact, setPickupContact] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [remarks, setRemarks] = useState('');

  // Update fields
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierPartner, setCourierPartner] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');

  // Proof fields
  const [receivedBy, setReceivedBy] = useState('');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('packing_slip');

  async function loadData() {
    setLoading(true);
    try {
      const [oRes, dRes] = await Promise.all([
        api.getOrders({ status: 'vendor_invoice_sent,ready_for_dispatch,dispatched,in_transit', limit: '50' }),
        api.getDispatches({ limit: '50' }),
      ]);
      setOrders(oRes.data ?? []);
      setDispatches(dRes.data ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function onSelectOrder(order: any) {
    setSelectedOrder(order);
    setMsg(null);
    try {
      const res = await api.getDispatchByOrder(order._id);
      setExistingDispatch(res.data);
      setTab('update');
    } catch {
      setExistingDispatch(null);
      setTab('create');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true); setMsg(null);
    try {
      const body: Record<string, unknown> = {
        orderId: selectedOrder._id, dispatchType,
        dispatchDate, expectedDeliveryDate: expectedDelivery, dispatchRemarks: remarks,
      };
      if (dispatchType === 'vendor_delivery') {
        Object.assign(body, { vehicleNumber, vehicleType, driverName, driverPhone });
      } else {
        Object.assign(body, { pickupAddress, contactPerson: pickupContact, contactNumber: pickupPhone, pickupTime });
      }
      const res = await api.createDispatch(body);
      setExistingDispatch(res.data);
      setTab('update');
      setMsg({ type: 'success', text: 'Dispatch created successfully!' });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Failed to create dispatch.' });
    } finally { setSubmitting(false); }
  }

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!existingDispatch || !newStatus) return;
    setSubmitting(true); setMsg(null);
    try {
      await api.updateDispatchStatus(existingDispatch._id, { status: newStatus, remarks: updateRemarks, trackingNumber, courierPartner });
      setMsg({ type: 'success', text: 'Dispatch status updated!' });
      const res = await api.getDispatchByOrder(selectedOrder._id);
      setExistingDispatch(res.data);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Update failed.' });
    } finally { setSubmitting(false); }
  }

  async function handleDocUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!existingDispatch || !docFile) return;
    setSubmitting(true); setMsg(null);
    try {
      const form = new FormData();
      form.append('document', docFile);
      form.append('documentType', docType);
      await api.uploadDispatchDoc(existingDispatch._id, form);
      setMsg({ type: 'success', text: 'Document uploaded!' });
      setDocFile(null);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Upload failed.' });
    } finally { setSubmitting(false); }
  }

  async function handleProofUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!existingDispatch || !proofFile) return;
    setSubmitting(true); setMsg(null);
    try {
      const form = new FormData();
      form.append('document', proofFile);
      form.append('type', 'photo');
      form.append('receivedBy', receivedBy);
      form.append('deliveryRemarks', deliveryRemarks);
      await api.uploadDeliveryProof(existingDispatch._id, form);
      setMsg({ type: 'success', text: 'Delivery proof uploaded! Order marked as delivered.' });
      setProofFile(null);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message ?? 'Upload failed.' });
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: SB.color }}>Dispatch Management</h1>
          <p className="text-sm mt-0.5" style={{ color: SB.muted }}>Create and update dispatch entries for your assigned orders.</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {msg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className={`text-sm font-medium ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Order List */}
        <div className="rounded-2xl overflow-hidden" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${SB.border}` }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>Orders Needing Dispatch</h2>
          </div>
          <div className="divide-y" style={{ borderColor: SB.border }}>
            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: SB.orange, borderTopColor: 'transparent' }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-10 text-center">
                <Truck className="w-10 h-10 mx-auto mb-2" style={{ color: SB.faint }} />
                <p className="text-sm" style={{ color: SB.faint }}>No orders awaiting dispatch</p>
              </div>
            ) : orders.map(order => (
              <button key={order._id} onClick={() => onSelectOrder(order)}
                className="w-full text-left p-4 transition-all"
                style={{ background: selectedOrder?._id === order._id ? 'var(--sb-orange-subtle)' : 'transparent', borderLeft: selectedOrder?._id === order._id ? '2px solid var(--sb-orange)' : '2px solid transparent' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold" style={{ color: SB.orange }}>{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs truncate" style={{ color: SB.color }}>{order.assignedProducts?.[0]?.productName ?? '—'}</p>
                <p className="text-xs mt-0.5" style={{ color: SB.faint }}>{order.deliveryAddress?.city ?? '—'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedOrder ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-20" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
              <Truck className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
              <p className="font-semibold" style={{ color: SB.muted }}>Select an order to manage dispatch</p>
            </div>
          ) : (
            <>
              {/* Order Summary */}
              <div className="rounded-2xl p-4" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>Selected Order</h3>
                  <Link to={vendorPath('orders', String(selectedOrder._id))} className="text-xs font-bold" style={{ color: SB.orange }}>View Full →</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    ['Order #', selectedOrder.orderNumber],
                    ['Product', selectedOrder.assignedProducts?.[0]?.productName ?? '—'],
                    ['Customer', selectedOrder.customer?.name ?? '—'],
                    ['City', selectedOrder.deliveryAddress?.city ?? '—'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p style={{ color: SB.faint }}>{l}</p>
                      <p className="font-semibold mt-0.5 truncate" style={{ color: SB.color }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {([['create', 'Create Dispatch'], ['update', 'Update Status'], ['proof', 'Delivery Proof']] as const).map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={tab === t
                      ? { background: 'var(--sb-orange)', color: '#fff' }
                      : { background: SB.card, color: SB.muted, border: `1px solid ${SB.border}` }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Create Dispatch */}
              {tab === 'create' && !existingDispatch && (
                <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SB.muted }}>Create Dispatch Entry</h3>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <Field label="Delivery Type" required>
                      <select value={dispatchType} onChange={e => setDispatchType(e.target.value as any)} className={inputCls} style={inputStyle}>
                        <option value="vendor_delivery">Vendor Self Delivery</option>
                        <option value="structbay_pickup">StructBay Pickup</option>
                      </select>
                    </Field>

                    {dispatchType === 'vendor_delivery' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Vehicle Number" required>
                            <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="MH-12-AB-1234" required className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="Vehicle Type">
                            <input type="text" value={vehicleType} onChange={e => setVehicleType(e.target.value)} placeholder="Truck / Tempo" className={inputCls} style={inputStyle} />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Driver Name" required>
                            <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} required placeholder="Full name" className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="Driver Phone">
                            <input type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={inputCls} style={inputStyle} />
                          </Field>
                        </div>
                      </>
                    ) : (
                      <>
                        <Field label="Pickup Address" required>
                          <textarea value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} required rows={2} placeholder="Warehouse address for StructBay pickup" className={inputCls} style={inputStyle} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Contact Person" required>
                            <input type="text" value={pickupContact} onChange={e => setPickupContact(e.target.value)} required className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="Contact Phone" required>
                            <input type="tel" value={pickupPhone} onChange={e => setPickupPhone(e.target.value)} required className={inputCls} style={inputStyle} />
                          </Field>
                        </div>
                        <Field label="Pickup Availability" required>
                          <input type="text" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required placeholder="e.g. 9:00 AM – 6:00 PM" className={inputCls} style={inputStyle} />
                        </Field>
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Dispatch Date" required>
                        <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} required className={inputCls} style={inputStyle} />
                      </Field>
                      <Field label="Expected Delivery">
                        <input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} className={inputCls} style={inputStyle} />
                      </Field>
                    </div>

                    <Field label="Remarks">
                      <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Special handling notes..." className={inputCls} style={inputStyle} />
                    </Field>

                    <button type="submit" disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                      style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                      {submitting ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Truck className="w-4 h-4" />}
                      {submitting ? 'Creating...' : 'Create Dispatch'}
                    </button>
                  </form>
                </div>
              )}

              {tab === 'create' && existingDispatch && (
                <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-400">Dispatch Already Created</p>
                    <p className="text-xs mt-1" style={{ color: SB.muted }}>Use "Update Status" or "Delivery Proof" tabs to continue.</p>
                  </div>
                </div>
              )}

              {/* Update Status */}
              {tab === 'update' && (
                <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SB.muted }}>Update Dispatch Status</h3>
                  {!existingDispatch ? (
                    <p className="text-sm" style={{ color: SB.faint }}>No dispatch created yet. Use "Create Dispatch" tab first.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: SB.bg }}>
                        <span className="text-xs" style={{ color: SB.muted }}>Current Status:</span>
                        <StatusBadge status={existingDispatch.status} />
                        {existingDispatch.trackingNumber && <span className="text-xs ml-auto" style={{ color: SB.faint }}>Track: {existingDispatch.trackingNumber}</span>}
                      </div>
                      <form onSubmit={handleStatusUpdate} className="space-y-4">
                        <Field label="New Status" required>
                          <select value={newStatus} onChange={e => setNewStatus(e.target.value)} required className={inputCls} style={inputStyle}>
                            <option value="">Select status...</option>
                            {DISPATCH_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Tracking Number">
                            <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="LR / Docket #" className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="Courier Partner">
                            <input type="text" value={courierPartner} onChange={e => setCourierPartner(e.target.value)} placeholder="Porter, Delhivery..." className={inputCls} style={inputStyle} />
                          </Field>
                        </div>
                        <Field label="Remarks">
                          <textarea value={updateRemarks} onChange={e => setUpdateRemarks(e.target.value)} rows={2} className={inputCls} style={inputStyle} />
                        </Field>
                        <button type="submit" disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                          style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                          {submitting ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          {submitting ? 'Updating...' : 'Update Status'}
                        </button>
                      </form>

                      {/* Upload dispatch doc */}
                      <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${SB.border}` }}>
                        <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: SB.muted }}>Upload Dispatch Document</h4>
                        <form onSubmit={handleDocUpload} className="flex gap-3">
                          <select value={docType} onChange={e => setDocType(e.target.value)} className="px-3 py-2 rounded-xl text-sm" style={inputStyle}>
                            <option value="packing_slip">Packing Slip</option>
                            <option value="shipping_label">Shipping Label</option>
                            <option value="dispatch_note">Dispatch Note</option>
                            <option value="quality_certificate">Quality Certificate</option>
                            <option value="other">Other</option>
                          </select>
                          <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm" style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: docFile ? SB.color : SB.faint }}>
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">{docFile ? docFile.name : 'Select file...'}</span>
                            <input type="file" className="hidden" onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
                          </label>
                          <button type="submit" disabled={!docFile || submitting}
                            className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                            style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                            <Upload className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Delivery Proof */}
              {tab === 'proof' && (
                <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SB.muted }}>Upload Delivery Proof</h3>
                  {!existingDispatch ? (
                    <p className="text-sm" style={{ color: SB.faint }}>Create dispatch first.</p>
                  ) : (
                    <form onSubmit={handleProofUpload} className="space-y-4">
                      <Field label="Received By">
                        <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Person who received the material" className={inputCls} style={inputStyle} />
                      </Field>
                      <Field label="Delivery Remarks">
                        <textarea value={deliveryRemarks} onChange={e => setDeliveryRemarks(e.target.value)} rows={2} placeholder="Any delivery notes..." className={inputCls} style={inputStyle} />
                      </Field>
                      <Field label="Delivery Photo / POD" required>
                        <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl cursor-pointer"
                          style={{ border: `2px dashed ${proofFile ? 'var(--sb-orange)' : SB.border}`, background: proofFile ? 'var(--sb-orange-subtle)' : SB.bg }}>
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                          {proofFile
                            ? <><CheckCircle className="w-8 h-8" style={{ color: SB.orange }} /><p className="text-sm font-medium" style={{ color: SB.color }}>{proofFile.name}</p></>
                            : <><Upload className="w-8 h-8" style={{ color: SB.faint }} /><p className="text-sm" style={{ color: SB.faint }}>Photo or PDF · Max 10MB</p></>
                          }
                        </label>
                      </Field>
                      <button type="submit" disabled={!proofFile || submitting}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
                        style={{ background: 'var(--sb-orange)', color: '#0D0D0D' }}>
                        {submitting ? <div className="w-4 h-4 rounded-full border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] animate-spin" /> : <Upload className="w-4 h-4" />}
                        {submitting ? 'Uploading...' : 'Upload Delivery Proof'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
