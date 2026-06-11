type Status =
  | 'new_order_alert' | 'ready_for_dispatch' | 'vendor_invoice_sent'
  | 'dispatched' | 'pickup_scheduled' | 'material_handed_over'
  | 'in_transit' | 'material_delivered' | 'delivery_confirmed'
  | 'completed' | 'cancelled'
  | 'pending' | 'uploaded' | 'verified' | 'rejected' | 'replaced'
  | 'ready' | 'delivered' | 'out_for_delivery'
  | 'assigned' | 'invoice_uploaded' | 'ready_dispatch' | 'dispatch_pending' | 'approved';

const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
  new_order_alert:     { label: 'New Order',          bg: 'rgba(249,115,22,0.12)', color: 'var(--sb-orange)', border: 'rgba(249,115,22,0.25)' },
  ready_for_dispatch:  { label: 'Ready for Dispatch', bg: 'rgba(168,85,247,0.12)', color: '#A855F7',          border: 'rgba(168,85,247,0.25)' },
  vendor_invoice_sent: { label: 'Invoice Sent',       bg: 'rgba(245,158,11,0.12)', color: '#F59E0B',          border: 'rgba(245,158,11,0.25)' },
  dispatched:          { label: 'Dispatched',         bg: 'rgba(99,102,241,0.12)', color: '#818CF8',          border: 'rgba(99,102,241,0.25)' },
  pickup_scheduled:    { label: 'Pickup Scheduled',   bg: 'rgba(6,182,212,0.12)',  color: '#22D3EE',          border: 'rgba(6,182,212,0.25)'  },
  material_handed_over:{ label: 'Handed Over',        bg: 'rgba(99,102,241,0.12)', color: '#818CF8',          border: 'rgba(99,102,241,0.25)' },
  in_transit:          { label: 'In Transit',         bg: 'rgba(99,102,241,0.12)', color: '#818CF8',          border: 'rgba(99,102,241,0.25)' },
  material_delivered:  { label: 'Delivered',          bg: 'rgba(34,197,94,0.12)',  color: '#22C55E',          border: 'rgba(34,197,94,0.25)'  },
  delivery_confirmed:  { label: 'Confirmed',          bg: 'rgba(34,197,94,0.12)',  color: '#22C55E',          border: 'rgba(34,197,94,0.25)'  },
  completed:           { label: 'Completed',          bg: 'rgba(34,197,94,0.12)',  color: '#22C55E',          border: 'rgba(34,197,94,0.25)'  },
  cancelled:           { label: 'Cancelled',          bg: 'rgba(239,68,68,0.12)',  color: '#EF4444',          border: 'rgba(239,68,68,0.25)'  },
  pending:             { label: 'Pending',            bg: 'rgba(156,163,175,0.1)', color: 'var(--sb-text-muted)', border: 'rgba(156,163,175,0.2)' },
  uploaded:            { label: 'Uploaded',           bg: 'rgba(245,158,11,0.12)', color: '#F59E0B',          border: 'rgba(245,158,11,0.25)' },
  verified:            { label: 'Verified',           bg: 'rgba(34,197,94,0.12)',  color: '#22C55E',          border: 'rgba(34,197,94,0.25)'  },
  rejected:            { label: 'Rejected',           bg: 'rgba(239,68,68,0.12)',  color: '#EF4444',          border: 'rgba(239,68,68,0.25)'  },
  replaced:            { label: 'Replaced',           bg: 'rgba(156,163,175,0.1)', color: 'var(--sb-text-muted)', border: 'rgba(156,163,175,0.2)' },
  ready:               { label: 'Ready',              bg: 'rgba(168,85,247,0.12)', color: '#A855F7',          border: 'rgba(168,85,247,0.25)' },
  delivered:           { label: 'Delivered',          bg: 'rgba(34,197,94,0.12)',  color: '#22C55E',          border: 'rgba(34,197,94,0.25)'  },
  out_for_delivery:    { label: 'Out for Delivery',   bg: 'rgba(6,182,212,0.12)',  color: '#22D3EE',          border: 'rgba(6,182,212,0.25)'  },
  // legacy keys kept for backward compat
  assigned:            { label: 'Assigned',           bg: 'rgba(249,115,22,0.12)', color: 'var(--sb-orange)', border: 'rgba(249,115,22,0.25)' },
  invoice_uploaded:    { label: 'Invoice Uploaded',   bg: 'rgba(245,158,11,0.12)', color: '#F59E0B',          border: 'rgba(245,158,11,0.25)' },
  ready_dispatch:      { label: 'Ready for Dispatch', bg: 'rgba(168,85,247,0.12)', color: '#A855F7',          border: 'rgba(168,85,247,0.25)' },
  dispatch_pending:    { label: 'Dispatch Pending',   bg: 'rgba(156,163,175,0.1)', color: 'var(--sb-text-muted)', border: 'rgba(156,163,175,0.2)' },
  approved:            { label: 'Approved',           bg: 'rgba(34,197,94,0.12)',  color: '#22C55E',          border: 'rgba(34,197,94,0.25)'  },
  dispatch_confirmed:  { label: 'Dispatch Confirmed', bg: 'rgba(168,85,247,0.12)', color: '#A855F7',          border: 'rgba(168,85,247,0.25)' },
  picked_up:           { label: 'Picked Up',          bg: 'rgba(6,182,212,0.12)',  color: '#22D3EE',          border: 'rgba(6,182,212,0.25)'  },
};

export function StatusBadge({ status }: { status: string }) {
  const key = String(status ?? '').toLowerCase();
  const c = cfg[key] ?? cfg.pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  );
}
