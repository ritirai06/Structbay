import { AlertTriangle } from "lucide-react";

/** PRD: visible on home, product, cart, checkout — site-paid delivery disclaimer. */
export function DeliveryChargesNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2.5 ${className}`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden />
      <span>
        <span className="font-semibold">Additional Delivery Charges Applicable.</span>{" "}
        Charges to be paid at site.
      </span>
    </div>
  );
}
