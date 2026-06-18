type Status =
  | 'new_order_alert' | 'ready_for_dispatch' | 'vendor_invoice_sent'
  | 'dispatched' | 'pickup_scheduled' | 'material_handed_over'
  | 'in_transit' | 'material_delivered' | 'delivery_confirmed'
  | 'completed' | 'cancelled'
  | 'pending' | 'uploaded' | 'verified' | 'rejected' | 'replaced'
  | 'ready' | 'delivered' | 'out_for_delivery'
  | 'assigned' | 'invoice_uploaded' | 'ready_dispatch' | 'dispatch_pending' | 'approved';

const cfg: Record<string, { label: string; className: string }> = {
  new_order_alert:     { label: 'New Order',          className: 'badge-processing' },
  ready_for_dispatch:  { label: 'Ready for Dispatch', className: 'badge-processing' },
  vendor_invoice_sent: { label: 'Invoice Sent',       className: 'badge-pending' },
  dispatched:          { label: 'Dispatched',         className: 'badge-processing' },
  pickup_scheduled:    { label: 'Pickup Scheduled',   className: 'badge-processing' },
  material_handed_over:{ label: 'Handed Over',        className: 'badge-processing' },
  in_transit:          { label: 'In Transit',         className: 'badge-processing' },
  material_delivered:  { label: 'Delivered',          className: 'badge-completed' },
  delivery_confirmed:  { label: 'Confirmed',          className: 'badge-completed' },
  completed:           { label: 'Completed',          className: 'badge-completed' },
  cancelled:           { label: 'Cancelled',          className: 'badge-cancelled' },
  pending:             { label: 'Pending',            className: 'badge-pending' },
  uploaded:            { label: 'Uploaded',           className: 'badge-pending' },
  verified:            { label: 'Verified',           className: 'badge-completed' },
  rejected:            { label: 'Rejected',           className: 'badge-cancelled' },
  replaced:            { label: 'Replaced',           className: 'badge-muted' },
  ready:               { label: 'Ready',              className: 'badge-processing' },
  delivered:           { label: 'Delivered',          className: 'badge-completed' },
  out_for_delivery:    { label: 'Out for Delivery',   className: 'badge-processing' },
  assigned:            { label: 'Assigned',           className: 'badge-processing' },
  invoice_uploaded:    { label: 'Invoice Uploaded',   className: 'badge-pending' },
  ready_dispatch:      { label: 'Ready for Dispatch', className: 'badge-processing' },
  dispatch_pending:    { label: 'Dispatch Pending',   className: 'badge-pending' },
  approved:            { label: 'Approved',           className: 'badge-completed' },
  dispatch_confirmed:  { label: 'Dispatch Confirmed', className: 'badge-processing' },
  picked_up:           { label: 'Picked Up',          className: 'badge-processing' },
};

export function StatusBadge({ status }: { status: string }) {
  const key = String(status ?? '').toLowerCase();
  const c = cfg[key] ?? cfg.pending;
  return (
    <span className={`sb-status-badge ${c.className}`}>
      {c.label}
    </span>
  );
}
