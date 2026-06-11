/** PRD: visible on home, product, cart, checkout — site-paid delivery disclaimer. */
export function DeliveryChargesNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2.5 ${className}`}
    >
      <span className="font-semibold">Additional Delivery Charges Applicable.</span>{" "}
      Charges to be paid at site.
    </div>
  );
}
