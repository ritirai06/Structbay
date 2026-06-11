import { useState } from "react";
import { ChevronDown, ChevronRight, Info, Shield, Zap } from "lucide-react";
import {
  CUSTOMER_MILESTONE_LABELS,
  STRUCTBAY_ASSURED_BLURB,
  STRUCTBAY_DELIVERY_FLOW,
  STRUCTBAY_EXPRESS_BLURB,
  VENDOR_DELIVERY_FLOW,
} from "../../lib/deliveryWorkflowReference";

function FlowTable({ title, rows }: { title: string; rows: { label: string; handoff: string }[] }) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <p className="text-xs font-bold text-[#FE5E00] uppercase tracking-wider px-3 py-2 bg-[#0D0D0D] border-b border-white/8">{title}</p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-[#D4C4A8]/50 border-b border-white/8">
            <th className="py-2 px-3 font-semibold">Step</th>
            <th className="py-2 px-3 font-semibold">Who → who</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-white/5 last:border-0">
              <td className="py-2 px-3 text-[#F4E9D8]/90 align-top">{r.label}</td>
              <td className="py-2 px-3 text-[#D4C4A8]/70 whitespace-nowrap">{r.handoff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeliveryWorkflowGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 rounded-xl border border-[#FE5E00]/25 bg-[#FE5E00]/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[#F4E9D8] hover:bg-[#FE5E00]/10 transition-colors"
      >
        <Info className="w-4 h-4 text-[#FE5E00] shrink-0" />
        <span className="flex-1">Product delivery types (Type A / Type B), customer milestones & badges</span>
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-4 text-xs text-[#D4C4A8]/80 border-t border-[#FE5E00]/15">
          <p className="leading-relaxed pt-3">
            Each vendor sub-order is either <strong className="text-[#F4E9D8]">Type A — Vendor delivery</strong> (vendor ships) or{" "}
            <strong className="text-[#F4E9D8]">Type B — StructBay delivery</strong> (StructBay books Porter/Delhivery and updates vendor + customer).
            Use the order detail modal to edit <strong className="text-[#F4E9D8]">delivery details</strong> shown to the customer and StructBay logistics fields for Type B.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <FlowTable title="Type A — Vendor delivery" rows={VENDOR_DELIVERY_FLOW} />
            <FlowTable title="Type B — StructBay delivery" rows={STRUCTBAY_DELIVERY_FLOW} />
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-2">
            <p className="text-[10px] font-bold text-[#D4C4A8]/50 uppercase tracking-wider mb-2">Customer-facing milestones (S → customer)</p>
            <ol className="list-decimal list-inside space-y-1 text-[#F4E9D8]/90">
              {CUSTOMER_MILESTONE_LABELS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ol>
            <p className="mt-2 text-[#D4C4A8]/55">Mapped from master order status; detailed notes use the delivery details field.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex gap-2 rounded-lg border border-[#C9A227]/25 bg-[#C9A227]/5 p-3">
              <Shield className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
              <p>{STRUCTBAY_ASSURED_BLURB}</p>
            </div>
            <div className="flex gap-2 rounded-lg border border-[#FE5E00]/25 bg-[#FE5E00]/5 p-3">
              <Zap className="w-5 h-5 text-[#FE5E00] shrink-0 mt-0.5" />
              <p>{STRUCTBAY_EXPRESS_BLURB}</p>
            </div>
          </div>
          <p className="text-[#D4C4A8]/50">
            Per-order admin ↔ customer chat: open an order → <strong className="text-[#F4E9D8]">Order chat</strong>, or share the customer link <span className="font-mono text-[#FE5E00]/90">/orders/&lt;id&gt;</span> after sign-in.
          </p>
        </div>
      )}
    </div>
  );
}
