import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, Truck, FileText, PackageCheck } from 'lucide-react';
import { WorkflowFilePreview, WorkflowFileUpload } from '@shared/components/workflow/WorkflowFileUpload';
import { api } from '../lib/api';
import { vendorPath } from '../../lib/portalRoutes';
import { Link } from 'react-router';
import { StatusBadge } from './StatusBadge';

const STEPS = [
  { key: 'NEW_ASSIGNED', label: 'Assigned' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'READY_FOR_DISPATCH', label: 'Ready dispatch' },
  { key: 'DISPATCH_APPROVED', label: 'Dispatch approved' },
  { key: 'VENDOR_INVOICE_SUBMITTED', label: 'Vendor invoice' },
  { key: 'SB_INVOICE_SENT', label: 'SB invoice sent' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'COMPLETED', label: 'Completed' },
];

function normStatus(status: string): string {
  if (status === 'ASSIGNED') return 'NEW_ASSIGNED';
  return status;
}

function stepIndex(status: string): number {
  const n = normStatus(status);
  if (n === 'CHANGES_REQUESTED') return 1;
  const i = STEPS.findIndex((s) => s.key === n);
  return i >= 0 ? i : 0;
}

function fmtWhen(d: unknown) {
  if (!d) return '—';
  try {
    return new Date(String(d)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(d);
  }
}

function SubmittedDocuments({ order }: { order: any }) {
  const pre = order?.preDispatch;
  const ship = order?.shipmentDispatch;
  const pod = order?.deliveryProof;

  const blocks: {
    title: string;
    meta: string[];
    files: { url: string; label: string }[];
  }[] = [];

  if (pre?.remarks || pre?.invoiceFileUrl || pre?.packingFiles?.length || order?.expectedDispatchDate) {
    blocks.push({
      title: 'Ready for dispatch',
      meta: [
        order?.expectedDispatchDate ? `Est. dispatch: ${fmtWhen(order.expectedDispatchDate)}` : '',
        pre?.remarks ? `Remarks: ${pre.remarks}` : '',
      ].filter(Boolean),
      files: [
        ...(pre?.invoiceFileUrl ? [{ url: pre.invoiceFileUrl, label: 'Pre-dispatch invoice' }] : []),
        ...(Array.isArray(pre?.packingFiles)
          ? pre.packingFiles
              .filter((f: { url?: string }) => f?.url)
              .map((f: { url: string; name?: string }, i: number) => ({
                url: f.url,
                label: f.name || `Packing file ${i + 1}`,
              }))
          : []),
      ],
    });
  }

  if (ship?.transporterName || ship?.lrNumber || ship?.proofUrl) {
    blocks.push({
      title: 'Dispatch',
      meta: [
        ship.transporterName ? `Transporter: ${ship.transporterName}` : '',
        ship.lrNumber ? `LR: ${ship.lrNumber}` : '',
        ship.vehicleNumber ? `Vehicle: ${ship.vehicleNumber}` : '',
        ship.dispatchDate ? `Date: ${fmtWhen(ship.dispatchDate)}` : '',
      ].filter(Boolean),
      files: ship.proofUrl ? [{ url: ship.proofUrl, label: 'Dispatch proof' }] : [],
    });
  }

  if (pod?.podUrl || pod?.deliveryDate) {
    blocks.push({
      title: 'Delivery (POD)',
      meta: [pod.deliveryDate ? `Date: ${fmtWhen(pod.deliveryDate)}` : ''].filter(Boolean),
      files: pod.podUrl ? [{ url: pod.podUrl, label: 'Proof of delivery' }] : [],
    });
  }

  if (!blocks.length) return null;

  return (
    <div className="wf-subsection">
      <p className="wf-subsection__title">Your submitted documents</p>
      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.title} className="rounded-lg border border-black/8 bg-white p-3 space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--sb-text-primary)' }}>{b.title}</p>
            {b.meta.map((line) => (
              <p key={line} className="text-xs" style={{ color: 'var(--sb-text-muted)' }}>{line}</p>
            ))}
            {b.files.length > 0 && <WorkflowFilePreview files={b.files} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function VendorWorkflowPanel({
  order,
  orderId,
  onUpdated,
}: {
  order: any;
  orderId: string;
  onUpdated: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [readyDate, setReadyDate] = useState('');
  const [readyRemark, setReadyRemark] = useState('');
  const [dispTransporter, setDispTransporter] = useState('');
  const [dispVehicle, setDispVehicle] = useState('');
  const [dispLr, setDispLr] = useState('');
  const [dispTrack, setDispTrack] = useState('');
  const [dispWhen, setDispWhen] = useState('');
  const [delWhen, setDelWhen] = useState('');
  const navigate = useNavigate();

  const st = String(order?.status ?? '');
  const typeB = order?.deliveryType === 'structbay_delivery';
  const allDone = st === 'COMPLETED';
  const idx = allDone ? STEPS.length : stepIndex(st);
  const pending = order?.pendingVendorAction as string | undefined;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await onUpdated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      if (/sign in again|session has expired/i.test(msg)) {
        navigate('/vendor/login', { replace: true });
        return;
      }
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const progressPct = allDone ? 100 : Math.round((idx / Math.max(STEPS.length - 1, 1)) * 100);

  return (
    <div className="wf-section">
      <div className="wf-section__head">
        <span className="wf-section__badge" aria-hidden>W</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="wf-section__title">Order workflow</h2>
            <StatusBadge status={st} />
          </div>
          <p className="wf-section__desc">
            {typeB ? 'Type B — StructBay delivers to customer after your invoice.' : 'Type A — You dispatch directly to the customer site.'}
          </p>
        </div>
      </div>

      <div className="wf-section__body space-y-4">
        <div className="rounded-lg border border-black/8 p-3" style={{ background: 'var(--sb-bg-section)' }}>
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sb-text-faint)' }}>
            <span>Progress</span>
            <span>{allDone ? 'Complete' : STEPS[Math.min(idx, STEPS.length - 1)]?.label}</span>
          </div>
          <div className="h-2 rounded-full bg-black/8 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--sb-orange)' }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {STEPS.map((s, i) => {
              const done = allDone || i < idx;
              const active = !allDone && i === idx && st !== 'REJECTED';
              return (
                <span
                  key={s.key}
                  className="text-[11px] font-medium"
                  style={{ color: done || active ? 'var(--sb-text-primary)' : 'var(--sb-text-faint)' }}
                >
                  {i + 1}. {s.label}
                </span>
              );
            })}
          </div>
        </div>

        {pending && (
          <div className="wf-milestone">
            <span><strong>Action needed:</strong> {pending}</span>
          </div>
        )}

        <SubmittedDocuments order={order} />

        {st === 'REJECTED' && (
          <p className="text-sm rounded-lg px-3 py-2 border border-red-200 bg-red-50 text-red-700">
            This sub-order was rejected.{order.rejectReason ? ` Reason: ${order.rejectReason}` : ''}
          </p>
        )}

        {(st === 'NEW_ASSIGNED' || st === 'ASSIGNED') && (
          <div className="wf-subsection">
            <p className="wf-subsection__title">Respond to assignment</p>
            <div className="wf-action-bar">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => api.workflowAccept(orderId))}
                className="wf-btn wf-btn--primary"
              >
                <CheckCircle className="w-4 h-4" /> Accept order
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <div className="wf-field">
                <label className="wf-field__label">Rejection reason (if declining)</label>
                <input
                  placeholder="e.g. Out of stock for assigned SKU"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="wf-field__input"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => api.workflowReject(orderId, rejectReason))}
                className="wf-btn wf-btn--secondary self-end"
                style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )}

        {(st === 'ACCEPTED' || st === 'CHANGES_REQUESTED') && (
          <div className="wf-subsection">
            <p className="wf-subsection__title">Submit ready for dispatch</p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.append('estimatedDispatchDate', readyDate);
                if (readyRemark) fd.append('remarks', readyRemark);
                const inp = (e.target as HTMLFormElement).elements.namedItem('packing') as HTMLInputElement;
                const inv = (e.target as HTMLFormElement).elements.namedItem('invoice') as HTMLInputElement;
                if (inp?.files) for (const f of Array.from(inp.files)) fd.append('packing', f);
                if (inv?.files?.[0]) fd.append('invoice', inv.files[0]);
                void run(() => api.workflowReadyDispatch(orderId, fd));
              }}
            >
              <div className="wf-field">
                <label className="wf-field__label">Estimated dispatch date *</label>
                <input
                  required
                  type="date"
                  value={readyDate}
                  onChange={(e) => setReadyDate(e.target.value)}
                  className="wf-field__input"
                />
              </div>
              <div className="wf-field">
                <label className="wf-field__label">Remarks (optional)</label>
                <textarea
                  value={readyRemark}
                  onChange={(e) => setReadyRemark(e.target.value)}
                  placeholder="Packing notes, batch numbers, site instructions…"
                  className="wf-field__input min-h-[72px] resize-y"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <WorkflowFileUpload
                  name="packing"
                  label="Packing photos / documents"
                  hint="Upload images or PDFs of packed material"
                  accept=".pdf,image/*"
                  multiple
                />
                <WorkflowFileUpload
                  name="invoice"
                  label="Pre-dispatch invoice (optional)"
                  hint="PDF or image if available before final tax invoice"
                  accept=".pdf,image/*"
                />
              </div>
              <div className="wf-form-footer">
                <button type="submit" disabled={busy} className="wf-btn wf-btn--primary">
                  <Truck className="w-4 h-4" /> Submit ready for dispatch
                </button>
              </div>
            </form>
          </div>
        )}

        {st === 'DISPATCH_APPROVED' && (
          <div className="wf-subsection">
            <p className="wf-subsection__title">Final tax invoice</p>
            <p className="text-sm mb-3" style={{ color: 'var(--sb-text-muted)' }}>
              Upload your GST tax invoice before StructBay can proceed with logistics.
            </p>
            <Link to={vendorPath('orders', orderId, 'invoice')} className="wf-btn wf-btn--primary no-underline inline-flex">
              <FileText className="w-4 h-4" /> Upload final tax invoice
            </Link>
          </div>
        )}

        {st === 'SB_INVOICE_SENT' && !typeB && (
          <div className="wf-subsection">
            <p className="wf-subsection__title">Mark dispatched (Type A)</p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.append('transporter_name', dispTransporter);
                fd.append('lr_number', dispLr);
                fd.append('dispatch_date', dispWhen);
                if (dispVehicle) fd.append('vehicle_number', dispVehicle);
                if (dispTrack) fd.append('tracking_number', dispTrack);
                const proof = (e.target as HTMLFormElement).elements.namedItem('proof') as HTMLInputElement;
                if (!proof?.files?.[0]) {
                  alert('Dispatch proof is required.');
                  return;
                }
                fd.append('proof', proof.files[0]);
                void run(() => api.workflowMarkDispatched(orderId, fd));
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="wf-field sm:col-span-2">
                  <label className="wf-field__label">Transporter name *</label>
                  <input required value={dispTransporter} onChange={(e) => setDispTransporter(e.target.value)} className="wf-field__input" placeholder="Courier / transport company" />
                </div>
                <div className="wf-field">
                  <label className="wf-field__label">Vehicle number</label>
                  <input value={dispVehicle} onChange={(e) => setDispVehicle(e.target.value)} className="wf-field__input" />
                </div>
                <div className="wf-field">
                  <label className="wf-field__label">LR / docket number *</label>
                  <input required value={dispLr} onChange={(e) => setDispLr(e.target.value)} className="wf-field__input" />
                </div>
                <div className="wf-field">
                  <label className="wf-field__label">Tracking ID (optional)</label>
                  <input value={dispTrack} onChange={(e) => setDispTrack(e.target.value)} className="wf-field__input" />
                </div>
                <div className="wf-field">
                  <label className="wf-field__label">Dispatch date *</label>
                  <input required type="date" value={dispWhen} onChange={(e) => setDispWhen(e.target.value)} className="wf-field__input" />
                </div>
              </div>
              <WorkflowFileUpload name="proof" label="Dispatch proof *" hint="Photo of loaded vehicle, LR copy, or signed challan" accept=".pdf,image/*" required />
              <div className="wf-form-footer">
                <button type="submit" disabled={busy} className="wf-btn wf-btn--primary">
                  <PackageCheck className="w-4 h-4" /> Mark dispatched
                </button>
              </div>
            </form>
          </div>
        )}

        {st === 'SB_INVOICE_SENT' && typeB && (
          <div className="wf-subsection">
            <p className="wf-subsection__title">StructBay handling delivery</p>
            <p className="text-sm" style={{ color: 'var(--sb-text-muted)' }}>
              StructBay has sent invoice & e-way bill. Porter/Delhivery pickup and customer delivery will be handled by StructBay — no further action needed from you.
            </p>
          </div>
        )}

        {st === 'DISPATCHED' && typeB && (
          <div className="wf-subsection">
            <p className="text-sm" style={{ color: 'var(--sb-text-muted)' }}>
              Order is out for delivery via StructBay logistics. You will be notified when delivery is complete.
            </p>
          </div>
        )}

        {st === 'DELIVERED' && typeB && (
          <div className="wf-subsection">
            <p className="text-sm" style={{ color: 'var(--sb-text-muted)' }}>
              StructBay marked delivery to the customer. Awaiting final confirmation.
            </p>
          </div>
        )}

        {st === 'DISPATCHED' && !typeB && (
          <div className="wf-subsection">
            <p className="wf-subsection__title">Submit proof of delivery</p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.append('delivery_date', delWhen);
                const pod = (e.target as HTMLFormElement).elements.namedItem('pod') as HTMLInputElement;
                if (!pod?.files?.[0]) {
                  alert('POD file is required.');
                  return;
                }
                fd.append('pod', pod.files[0]);
                void run(() => api.workflowMarkDelivered(orderId, fd));
              }}
            >
              <div className="wf-field max-w-xs">
                <label className="wf-field__label">Delivery date *</label>
                <input required type="date" value={delWhen} onChange={(e) => setDelWhen(e.target.value)} className="wf-field__input" />
              </div>
              <WorkflowFileUpload name="pod" label="Proof of delivery *" hint="Signed challan, site photo, or customer acknowledgement" accept=".pdf,image/*" required />
              <div className="wf-form-footer">
                <button type="submit" disabled={busy} className="wf-btn wf-btn--primary">
                  <PackageCheck className="w-4 h-4" /> Submit delivery
                </button>
              </div>
            </form>
          </div>
        )}

        {st === 'DELIVERED' && !typeB && (
          <div className="wf-subsection">
            <p className="text-sm" style={{ color: 'var(--sb-text-muted)' }}>
              Awaiting StructBay to confirm delivery after POD review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
