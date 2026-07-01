import { Tag } from "lucide-react";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";
import type { CartSummary } from "../lib/cartTotals";

type Props = {
  itemCount: number;
  summary: CartSummary;
  coupon?: string;
  onCouponChange?: (v: string) => void;
  couponApplied?: boolean;
  onApplyCoupon?: () => void;
  showCoupon?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  extraBelowTotal?: React.ReactNode;
};

export function CartOrderSummary({
  itemCount,
  summary,
  coupon = "",
  onCouponChange,
  couponApplied = false,
  onApplyCoupon,
  showCoupon = true,
  header,
  footer,
  extraBelowTotal,
}: Props) {
  return (
    <div className="sb-order-summary">
      <h3 className="font-bold text-foreground mb-4">Order Summary</h3>

      {header ? <div className="mb-4">{header}</div> : null}

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">
            {summary.subtotalLabel} ({itemCount} items)
          </span>
          <span className="font-medium tabular-nums">₹{summary.displaySubtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{summary.gstLabel}</span>
          <span className="tabular-nums">
            {summary.gstAmount > 0 ? `₹${summary.gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Delivery</span>
          <span className="text-amber-800 text-xs font-medium text-right max-w-[9rem]">Pay at site</span>
        </div>
        {summary.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Coupon {couponApplied ? `(${coupon})` : ""}</span>
            <span className="tabular-nums">-₹{summary.discount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <hr className="border-border" />
        <div className="flex justify-between font-bold text-base gap-3">
          <span>{summary.totalLabel}</span>
          <span className="tabular-nums" style={{ color: "var(--sb-orange)" }}>
            ₹{summary.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {showCoupon && onCouponChange && onApplyCoupon && (
        <div className="mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={coupon}
                onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                placeholder="Enter coupon (try SB5)"
                className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={onApplyCoupon}
              style={{ backgroundColor: couponApplied ? "var(--sb-green, #16a34a)" : "var(--sb-orange)" }}
              className="px-3 py-2.5 rounded-xl text-white text-sm font-medium"
              disabled={couponApplied}
            >
              {couponApplied ? "Applied" : "Apply"}
            </button>
          </div>
        </div>
      )}

      {extraBelowTotal}
      {footer}

      <div className="mt-3">
        <DeliveryChargesNotice />
      </div>
    </div>
  );
}
