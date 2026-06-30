import { useState } from "react";
import { ChevronDown, ChevronRight, Info, Shield, Zap } from "lucide-react";
import {
  CUSTOMER_MILESTONE_LABELS,
  Structbay_ASSURED_BLURB,
  Structbay_DELIVERY_FLOW,
  Structbay_EXPRESS_BLURB,
  VENDOR_DELIVERY_FLOW,
} from "../../lib/deliveryWorkflowReference";

function FlowTable({ title, rows }: { title: string; rows: { label: string; handoff: string }[] }) {
  return (
    <div className="rounded-lg border border-sb-ink/10 overflow-hidden">
      <p className="text-xs font-bold text-sb-orange uppercase tracking-wider px-3 py-2 bg-sb-cream border-b border-sb-ink/10">{title}</p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-sb-ink/50 border-b border-sb-ink/10">
            <th className="py-2 px-3 font-semibold">Step</th>
            <th className="py-2 px-3 font-semibold">Who → who</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-sb-ink/8 last:border-0">
              <td className="py-2 px-3 text-sb-ink/90 align-top">{r.label}</td>
              <td className="py-2 px-3 text-sb-ink/65 whitespace-nowrap">{r.handoff}</td>
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
    <div className="mb-6 rounded-xl border border-sb-orange/25 bg-sb-orange/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-sb-ink hover:bg-sb-orange/10 transition-colors"
      >
        <Info className="w-4 h-4 text-sb-orange shrink-0" />
        <span className="flex-1">Product delivery types (Type A / Type B), customer milestones & badges</span>
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-4 text-xs text-sb-ink/70 border-t border-sb-orange/15">
          <p className="leading-relaxed pt-3">
            Each vendor sub-order is either <strong className="text-sb-ink">Type A — Vendor delivery</strong> (vendor ships) or{" "}
            <strong className="text-sb-ink">Type B — Structbay delivery</strong> (Structbay books Porter/Delhivery and updates vendor + customer).
            Use the <strong className="text-sb-ink">order detail page</strong> (open any order from the list) to edit <strong className="text-sb-ink">delivery details</strong> shown to the customer and Structbay logistics fields for Type B — all steps on one scrollable page.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <FlowTable title="Type A — Vendor delivery" rows={VENDOR_DELIVERY_FLOW} />
            <FlowTable title="Type B — Structbay delivery" rows={Structbay_DELIVERY_FLOW} />
          </div>
          <div className="rounded-lg border border-sb-ink/10 bg-sb-cream px-3 py-2">
            <p className="text-[10px] font-bold text-sb-ink/50 uppercase tracking-wider mb-2">Customer-facing milestones (S → customer)</p>
            <ol className="list-decimal list-inside space-y-1 text-sb-ink/90">
              {CUSTOMER_MILESTONE_LABELS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ol>
            <p className="mt-2 text-sb-ink/50">Mapped from master order status; detailed notes use the delivery details field.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex gap-2 rounded-lg border border-sb-orange/25 bg-sb-orange/8 p-3">
              <Shield className="w-5 h-5 text-sb-orange shrink-0 mt-0.5" />
              <p>{Structbay_ASSURED_BLURB}</p>
            </div>
            <div className="flex gap-2 rounded-lg border border-sb-orange/25 bg-sb-orange/5 p-3">
              <Zap className="w-5 h-5 text-sb-orange shrink-0 mt-0.5" />
              <p>{Structbay_EXPRESS_BLURB}</p>
            </div>
          </div>
          <p className="text-sb-ink/50">
            Per-order admin ↔ customer chat: open an order → <strong className="text-sb-ink">Order chat</strong>, or share the customer link <span className="font-mono text-sb-orange">/orders/&lt;id&gt;</span> after sign-in.
          </p>
          <p className="text-sb-ink/50 pt-2 border-t border-sb-orange/10">
            Use <strong className="text-sb-ink">Order Management</strong> for the customer&apos;s master order; pick a vendor from the list on the order. Delivery type and tax invoices are handled via vendor sub-orders and the <strong className="text-sb-ink">Invoices</strong> area.
          </p>
        </div>
      )}
    </div>
  );
}
