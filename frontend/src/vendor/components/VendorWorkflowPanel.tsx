import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Truck, FileText, PackageCheck } from 'lucide-react';
import { api } from '../lib/api';
import { vendorPath } from '../../lib/portalRoutes';
import { Link } from 'react-router';
import { StatusBadge } from './StatusBadge';

const SB = { color: 'var(--sb-text-primary)', muted: 'var(--sb-text-muted)', faint: 'var(--sb-text-faint)', orange: 'var(--sb-orange)', card: 'var(--sb-card)', border: 'var(--sb-border)', bg: 'var(--sb-bg-section)' };

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

  const st = String(order?.status ?? '');
  const allDone = st === 'COMPLETED';
  const idx = allDone ? STEPS.length : stepIndex(st);
  const pending = order?.pendingVendorAction as string | undefined;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl p-5 space-y-5" style={{ background: SB.card, border: `1px solid ${SB.border}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: SB.muted }}>StructBay workflow</h2>
        <StatusBadge status={st} />
      </div>
      {pending && (
        <p className="text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid var(--sb-orange-border)', color: SB.color }}>
          <span className="font-semibold" style={{ color: SB.orange }}>Pending: </span>{pending}
        </p>
      )}

      <div className="space-y-2">
        {STEPS.map((s, i) => {
          const done = allDone || i < idx;
          const active = !allDone && i === idx && st !== 'REJECTED';
          return (
            <div key={s.key} className="flex items-center gap-3 text-sm">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{
                  background: done || active ? 'var(--sb-orange)' : SB.bg,
                  color: done || active ? '#fff' : SB.faint,
                  border: `1px solid ${done || active ? 'var(--sb-orange)' : SB.border}`,
                }}
              >
                {i + 1}
              </div>
              <span style={{ color: done || active ? SB.color : SB.faint }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {st === 'REJECTED' && (
        <p className="text-sm" style={{ color: SB.muted }}>
          This sub-order was rejected.{order.rejectReason ? ` Reason: ${order.rejectReason}` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(st === 'NEW_ASSIGNED' || st === 'ASSIGNED') && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => api.workflowAccept(orderId))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--sb-orange)' }}
            >
              <CheckCircle className="w-4 h-4" /> Accept
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <input
                placeholder="Reject reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-w-[180px] px-3 py-2 rounded-xl text-sm"
                style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => api.workflowReject(orderId, rejectReason))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </>
        )}

        {(st === 'ACCEPTED' || st === 'CHANGES_REQUESTED') && (
          <form
            className="space-y-3 w-full max-w-lg"
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
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>Ready for dispatch</p>
            <input
              required
              type="date"
              value={readyDate}
              onChange={(e) => setReadyDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <textarea
              value={readyRemark}
              onChange={(e) => setReadyRemark(e.target.value)}
              placeholder="Remarks (optional)"
              className="w-full px-3 py-2 rounded-xl text-sm min-h-[72px]"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: SB.muted }}>
              <label className="flex flex-col gap-1">
                Packing files (PDF/images)
                <input name="packing" type="file" multiple accept=".pdf,image/*" className="text-xs" />
              </label>
              <label className="flex flex-col gap-1">
                Optional invoice (PDF)
                <input name="invoice" type="file" accept=".pdf,image/*" className="text-xs" />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--sb-orange)' }}
            >
              <Truck className="w-4 h-4" /> Submit ready for dispatch
            </button>
          </form>
        )}

        {st === 'DISPATCH_APPROVED' && (
          <Link
            to={vendorPath('orders', orderId, 'invoice')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--sb-orange)' }}
          >
            <FileText className="w-4 h-4" /> Upload final tax invoice
          </Link>
        )}

        {st === 'SB_INVOICE_SENT' && (
          <form
            className="space-y-3 w-full max-w-lg"
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
                alert('Dispatch proof PDF/image is required.');
                return;
              }
              fd.append('proof', proof.files[0]);
              void run(() => api.workflowMarkDispatched(orderId, fd));
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>Mark dispatched</p>
            <input
              required
              placeholder="Transporter name"
              value={dispTransporter}
              onChange={(e) => setDispTransporter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Vehicle no."
                value={dispVehicle}
                onChange={(e) => setDispVehicle(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
              />
              <input
                required
                placeholder="LR number"
                value={dispLr}
                onChange={(e) => setDispLr(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
              />
            </div>
            <input
              placeholder="Tracking (optional)"
              value={dispTrack}
              onChange={(e) => setDispTrack(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <input
              required
              type="date"
              value={dispWhen}
              onChange={(e) => setDispWhen(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <label className="text-xs flex flex-col gap-1" style={{ color: SB.muted }}>
              Dispatch proof
              <input name="proof" type="file" accept=".pdf,image/*" required className="text-xs" />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--sb-orange)' }}
            >
              <PackageCheck className="w-4 h-4" /> Mark dispatched
            </button>
          </form>
        )}

        {st === 'DISPATCHED' && (
          <form
            className="space-y-3 w-full max-w-lg"
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
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SB.faint }}>Mark delivered (POD)</p>
            <input
              required
              type="date"
              value={delWhen}
              onChange={(e) => setDelWhen(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.color }}
            />
            <label className="text-xs flex flex-col gap-1" style={{ color: SB.muted }}>
              Proof of delivery
              <input name="pod" type="file" accept=".pdf,image/*" required className="text-xs" />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--sb-orange)' }}
            >
              <Upload className="w-4 h-4" /> Submit delivery
            </button>
          </form>
        )}

        {st === 'DELIVERED' && <p className="text-sm" style={{ color: SB.muted }}>Awaiting StructBay to confirm delivery (POD review).</p>}
      </div>
    </div>
  );
}
