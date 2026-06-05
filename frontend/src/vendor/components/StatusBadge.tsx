type Status =
  | "assigned"
  | "invoice_uploaded"
  | "ready_dispatch"
  | "dispatch_pending"
  | "dispatched"
  | "delivered"
  | "rejected"
  | "pending"
  | "approved";

const statusConfig: Record<Status, { label: string; className: string }> = {
  assigned:        { label: "Assigned",             className: "bg-[#FE5E00]/15 text-[#FE5E00] border border-[#FE5E00]/25" },
  invoice_uploaded:{ label: "Invoice Uploaded",     className: "bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/25" },
  ready_dispatch:  { label: "Ready for Dispatch",   className: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
  dispatch_pending:{ label: "Dispatch Pending",     className: "bg-white/10 text-[#D4C4A8] border border-white/15" },
  dispatched:      { label: "Dispatched",           className: "bg-[#EADCC6]/15 text-[#EADCC6] border border-[#EADCC6]/20" },
  delivered:       { label: "Delivered",            className: "bg-green-500/15 text-green-400 border border-green-500/20" },
  rejected:        { label: "Rejected",             className: "bg-red-500/15 text-red-400 border border-red-500/20" },
  pending:         { label: "Pending Review",       className: "bg-white/8 text-[#D4C4A8]/70 border border-white/10" },
  approved:        { label: "Approved",             className: "bg-green-500/15 text-green-400 border border-green-500/20" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
