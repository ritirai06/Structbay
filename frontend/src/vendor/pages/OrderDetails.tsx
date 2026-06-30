import { useParams, Link } from 'react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, MapPin, Upload, Truck, CheckCircle, Circle, AlertCircle, Phone, User, Clock } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { VendorWorkflowPanel } from '../components/VendorWorkflowPanel';
import { VendorOrderDocuments } from '../components/VendorOrderDocuments';
import { api } from '../lib/api';
import { vendorPath } from '../../lib/portalRoutes';
import { formatPaymentMethod, formatPaymentStatus } from '../../lib/paymentLabels';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

/** Backend vendor-order lifecycle (lowercase canonical). */
const LIFECYCLE = [
  'assigned',
  'invoice_uploaded',
  'ready_for_dispatch',
  'dispatch_confirmed',
  'pickup_scheduled',
  'picked_up',
  'in_transit',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'completed',
] as const;

function norm(s: string) {
  return String(s ?? '').toLowerCase().replace(/-/g, '_');
}

function canonicalVendorStatus(raw: string): string {
  const n = norm(raw);
  const map: Record<string, string> = {
    new_order_alert: 'assigned',
    vendor_invoice_sent: 'invoice_uploaded',
    material_delivered: 'delivered',
    delivery_confirmed: 'completed',
    material_handed_over: 'picked_up',
  };
  return map[n] ?? n;
}

function lifecycleIndex(status: string): number {
  if (norm(status) === 'cancelled') return -1;
  const c = canonicalVendorStatus(status);
  const i = LIFECYCLE.indexOf(c as (typeof LIFECYCLE)[number]);
  return i >= 0 ? i : 0;
}

/** Five visual milestones for the progress bar (matches mixed vendor + dispatch statuses). */
const PROGRESS_STEPS = [
  { label: 'Assigned' },
  { label: 'Invoice' },
  { label: 'Ready' },
  { label: 'In transit' },
  { label: 'Delivered' },
];

function progressVisualIndex(lifeIdx: number): number {
  if (lifeIdx < 0) return -1;
  if (lifeIdx <= 0) return 0;
  if (lifeIdx === 1) return 1;
  if (lifeIdx <= 3) return 2;
  if (lifeIdx <= 7) return 3;
  return 4;
}

function invoiceNorm(s: string) {
  return String(s ?? '').toUpperCase();
}

function formatAddress(addr: Record<string, unknown> | undefined | null): string {
  if (!addr) return '';
  const parts = [addr.line1, addr.line2, addr.street, addr.area, addr.city, addr.state, addr.pincode]
    .map(v => (v != null && v !== '' ? String(v) : ''))
    .filter(Boolean);
  return parts.join(', ');
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: SB.faint }}>{label}</p>
      <p className="font-medium text-sm" style={{ color: SB.color }}>{value || '—'}</p>
    </div>
  );
}

export function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [oRes, dRes] = await Promise.allSettled([
          api.getOrder(orderId!),
          api.getDispatchByOrder(orderId!),
        ]);
        if (oRes.status === 'fulfilled') setOrder(oRes.value.data);
        if (dRes.status === 'fulfilled') setDispatch(dRes.value.data);
      } finally { setLoading(false); }
    }
    load();
  }, [orderId]);

  const reload = async () => {
    const [oRes, dRes] = await Promise.allSettled([
      api.getOrder(orderId!),
      api.getDispatchByOrder(orderId!),
    ]);
    if (oRes.status === 'fulfilled') setOrder(oRes.value.data);
    if (dRes.status === 'fulfilled') setDispatch(dRes.value.data);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--sb-orange)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center py-20">
      <AlertCircle className="w-12 h-12 mb-3" style={{ color: SB.faint }} />
      <p className="font-semibold" style={{ color: SB.muted }}>Order not found</p>
      <Link to={vendorPath('orders')} className="mt-4 text-sm font-semibold" style={{ color: SB.orange }}>← Back to Orders</Link>
    </div>
  );

  const assignedLines = Array.isArray(order.items) ? order.items : [];
  const cust = order.customerInfo ?? order.customer ?? {};
  const inv = invoiceNorm(order.invoiceStatus);
  const lifeIdx = lifecycleIndex(order.status);
  const currentIdx = progressVisualIndex(lifeIdx);
  const flow = PROGRESS_STEPS;
  const lineProgress = currentIdx < 0 ? 0 : flow.length <= 1 ? 100 : (currentIdx / (flow.length - 1)) * 100;

  return (
    <div className="space-y-5">
      <p className="text-xs rounded-lg px-3 py-2" style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.muted }}>
        You only see line items assigned to you on this vendor order — not the customer’s full order elsewhere.
      </p>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={vendorPath('orders')} className="p-2 rounded-xl transition-colors" style={{ background: SB.card, border: `1px solid ${SB.border}`, color: SB.muted }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold" style={{ color: SB.color }}>{order.orderNumber}</h1>
            {order.priority === 'urgent' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>URGENT</span>
            )}
            {order.priority === 'high' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>HIGH</span>
            )}
          </div>
          <p className="text-sm" style={{ color: SB.muted }}>
            {order.deliveryType === 'structbay_delivery' ? 'Structbay Delivery' : 'Vendor Delivery'} ·{' '}
            Assigned {order.assignedAt ? new Date(order.assignedAt).toLocaleDateString('en-IN') : '—'}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.masterOrder && typeof order.masterOrder === 'object' && (
        <div className="rounded-2xl p-4" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="vendor-section-title mb-3" style={{ color: SB.muted }}>Customer payment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow label="Method" value={formatPaymentMethod(order.masterOrder.paymentMethod)} />
            <InfoRow label="Status" value={formatPaymentStatus(order.masterOrder.paymentStatus)} />
            {order.masterOrder.grandTotal != null && (
              <InfoRow label="Order total" value={`₹${Number(order.masterOrder.grandTotal).toLocaleString('en-IN')}`} />
            )}
            {order.masterOrder.orderNumber && (
              <InfoRow label="Master order" value={String(order.masterOrder.orderNumber)} />
            )}
          </div>
        </div>
      )}

      {/* Status Tracker — legacy orders (workflow v1) */}
      {Number(order.workflowVersion) !== 2 && (
      <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        <h2 className="vendor-section-title mb-5" style={{ color: SB.muted }}>Order Progress</h2>
        {currentIdx < 0 ? (
          <p className="text-sm font-medium" style={{ color: SB.muted }}>This order was cancelled.</p>
        ) : (
          <div className="relative flex items-start justify-between">
            <div className="absolute top-4 left-0 right-0 h-px" style={{ background: SB.border, zIndex: 0 }} />
            <div className="absolute top-4 left-0 h-px transition-all duration-500"
              style={{ background: 'var(--sb-orange)', width: `${lineProgress}%`, zIndex: 1 }}
            />
            {flow.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.label} className="flex flex-col items-center relative z-10" style={{ minWidth: 72 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ background: done ? 'var(--sb-orange)' : SB.bg, border: `2px solid ${done ? 'var(--sb-orange)' : SB.border}`, boxShadow: active ? '0 0 0 4px rgba(249,115,22,0.2)' : 'none' }}>
                    {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Circle className="w-3 h-3" style={{ color: SB.faint }} />}
                  </div>
                  <p className="text-[10px] font-semibold text-center mt-2 max-w-[68px] leading-tight" style={{ color: done ? SB.color : SB.faint }}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {Number(order.workflowVersion) === 2 && orderId && (
        <VendorWorkflowPanel order={order} orderId={orderId} onUpdated={reload} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="wf-section">
          <div className="wf-section__head">
            <span className="wf-section__badge">1</span>
            <div>
              <h2 className="wf-section__title">Assigned products</h2>
              <p className="wf-section__desc">Line items on this vendor sub-order only</p>
            </div>
          </div>
          <div className="wf-section__body space-y-3">
          {assignedLines.length === 0 && (
            <p className="text-sm" style={{ color: SB.muted }}>No line items on this vendor order.</p>
          )}
          {assignedLines.map((p: any, i: number) => (
            <div key={p._id ?? i} className="p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Product" value={p.productName ?? p.product?.name ?? '—'} />
                {(p.variationLabel || p.variation?.attributes) && (
                  <InfoRow
                    label="Variant"
                    value={
                      p.variationLabel
                      || Object.values(p.variation?.attributes || {}).filter(Boolean).join(' · ')
                      || '—'
                    }
                  />
                )}
                <InfoRow label="SKU" value={p.sku ?? p.product?.sku ?? '—'} />
                <InfoRow label="Quantity" value={String(p.quantity ?? '—')} />
                <InfoRow label="GST %" value={p.gstPercentage != null ? String(p.gstPercentage) : '—'} />
                <InfoRow label="Unit Price" value={p.unitPrice != null ? `₹${Number(p.unitPrice).toLocaleString('en-IN')}` : '—'} />
                <InfoRow label="Line Total" value={p.lineTotal != null ? `₹${Number(p.lineTotal).toLocaleString('en-IN')}` : '—'} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/6">
            <InfoRow label="Sub-order total" value={`₹${order.totalAmount?.toLocaleString('en-IN') ?? '—'}`} />
            <InfoRow label="Invoice status" value={order.invoiceStatus ?? '—'} />
          </div>
          </div>
        </div>

        <div className="wf-section">
          <div className="wf-section__head">
            <span className="wf-section__badge">2</span>
            <div>
              <h2 className="wf-section__title">Customer & delivery</h2>
              <p className="wf-section__desc">Site address and contact for fulfillment</p>
            </div>
          </div>
          <div className="wf-section__body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Customer" value={cust.name ?? '—'} />
            <InfoRow label="Contact" value={cust.phone ?? '—'} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: SB.faint }}>Delivery Address</p>
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: SB.bg, border: `1px solid ${SB.border}` }}>
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
              <div>
                <p className="text-sm" style={{ color: SB.color }}>
                  {formatAddress(order.deliveryAddress) || '—'}
                </p>
                {order.deliveryAddress?.contactPerson && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs flex items-center gap-1" style={{ color: SB.muted }}>
                      <User className="w-3 h-3" />{order.deliveryAddress.contactPerson}
                    </span>
                    {order.deliveryAddress.contactPhone && (
                      <span className="text-xs flex items-center gap-1" style={{ color: SB.muted }}>
                        <Phone className="w-3 h-3" />{order.deliveryAddress.contactPhone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {order.dispatchInstructions && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SB.orange }}>Dispatch Instructions</p>
              <p className="text-sm" style={{ color: SB.muted }}>{order.dispatchInstructions}</p>
            </div>
          )}
          </div>
        </div>
      </div>

      {order.deliveryType === "structbay_delivery" && (
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <h2 className="vendor-section-title mb-4" style={{ color: SB.muted }}>Structbay pickup & logistics</h2>
          {order.structbayLogistics?.pickupScheduledText || order.structbayLogistics?.companyName || order.structbayLogistics?.driverContactDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label="Pickup scheduled" value={order.structbayLogistics?.pickupScheduledText} />
              <InfoRow label="Logistics company" value={order.structbayLogistics?.companyName} />
              <InfoRow label="Driver / coordinator" value={order.structbayLogistics?.driverContactDetails} />
            </div>
          ) : (
            <p className="text-sm" style={{ color: SB.muted }}>Structbay will add pickup time, logistics partner, and driver contact here after the shipment is booked.</p>
          )}
        </div>
      )}

      {/* Dispatch Info */}
      {dispatch && (
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4" style={{ color: SB.orange }} />
            <h2 className="vendor-section-title" style={{ color: SB.muted }}>Dispatch Details</h2>
            <StatusBadge status={dispatch.status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dispatch.vehicleDetails?.vehicleNumber && <InfoRow label="Vehicle No." value={dispatch.vehicleDetails.vehicleNumber} />}
            {dispatch.vehicleDetails?.driverName && <InfoRow label="Driver" value={dispatch.vehicleDetails.driverName} />}
            {dispatch.vehicleDetails?.driverPhone && <InfoRow label="Driver Phone" value={dispatch.vehicleDetails.driverPhone} />}
            {dispatch.trackingNumber && <InfoRow label="Tracking #" value={dispatch.trackingNumber} />}
            {dispatch.dispatchDate && <InfoRow label="Dispatch Date" value={new Date(dispatch.dispatchDate).toLocaleDateString('en-IN')} />}
            {dispatch.courierPartner && <InfoRow label="Courier" value={dispatch.courierPartner} />}
          </div>
        </div>
      )}

      {Number(order.workflowVersion) !== 2 && (
      <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
        <h2 className="vendor-section-title mb-4" style={{ color: SB.muted }}>Actions</h2>
        <div className="flex flex-wrap gap-3">
          {inv === 'PENDING' && (
            <Link to={vendorPath('orders', orderId!, 'invoice')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--sb-orange)', color: '#fff' }}>
              <Upload className="w-4 h-4" /> Upload Invoice
            </Link>
          )}
          {inv === 'REJECTED' && (
            <Link to={vendorPath('orders', orderId!, 'invoice')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Upload className="w-4 h-4" /> Replace Invoice
            </Link>
          )}
          {(norm(order.status) === 'invoice_uploaded' || norm(order.status) === 'vendor_invoice_sent' || norm(order.status) === 'assigned') && !dispatch && (
            <Link to={vendorPath('orders', orderId!, 'ready-dispatch')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: SB.bg, color: SB.color, border: `1px solid ${SB.border}` }}>
              <Truck className="w-4 h-4" /> Mark Ready for Dispatch
            </Link>
          )}
          {order.deliveryType === 'structbay_delivery' && inv !== 'PENDING' && (
            <Link to={vendorPath('orders', orderId!, 'warehouse')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: SB.bg, color: SB.color, border: `1px solid ${SB.border}` }}>
              <MapPin className="w-4 h-4" /> Pickup / Warehouse Details
            </Link>
          )}
          <Link to={vendorPath('dispatch')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: SB.bg, color: SB.color, border: `1px solid ${SB.border}` }}>
            <Truck className="w-4 h-4" /> Update Dispatch
          </Link>
        </div>
      </div>
      )}

      {Number(order.workflowVersion) === 2 && (
        <div className="wf-subsection">
          <p className="wf-subsection__title">Documents</p>
          <p className="text-xs mb-3" style={{ color: SB.muted }}>
            Structbay invoice and e-way bill when sent. Shipping label appears only if Structbay explicitly shares it with you.
          </p>
          <VendorOrderDocuments documents={order.documents} />
        </div>
      )}

      {/* Status History */}
      {order.statusHistory?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: SB.orange }} />
            <h2 className="vendor-section-title" style={{ color: SB.muted }}>Status History</h2>
          </div>
          <div className="space-y-3">
            {[...order.statusHistory].reverse().map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: i === 0 ? 'var(--sb-orange)' : SB.border }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-xs" style={{ color: SB.faint }}>
                      {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                  {(h.note || h.remarks) && <p className="text-xs mt-1" style={{ color: SB.muted }}>{h.note || h.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Notes */}
      {order.adminNotes && (
        <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid var(--sb-orange-border)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: SB.orange }} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: SB.orange }}>Admin Notes</p>
            <p className="text-sm" style={{ color: 'var(--sb-text-secondary)' }}>{order.adminNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
