import { Link, useNavigate } from "react-router";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useMemo, useState } from "react";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";
import { CartOrderSummary } from "../components/CartOrderSummary";
import {
  buildCartSummaryFromLines,
  formatCartLineDisplay,
  lineSubtotalExGst,
} from "../lib/cartTotals";

export function Cart() {
  const { cart, removeFromCart, updateQty, isLoggedIn } = useApp();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const discount = couponApplied
    ? Math.round(cart.reduce((s, item) => s + lineSubtotalExGst(item), 0) * 0.05)
    : 0;
  const summary = useMemo(
    () => buildCartSummaryFromLines(cart, "exclusive", discount),
    [cart, discount]
  );

  const applyCoupon = () => {
    if (coupon.toUpperCase() === "SB5") setCouponApplied(true);
    else alert("Invalid coupon code. Try SB5 for 5% off.");
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div style={{ backgroundColor: "var(--sb-orange)" }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add construction materials to get started</p>
        <Link to="/category/cement" style={{ backgroundColor: "var(--sb-orange)" }} className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90">
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Cart ({cart.length} items)</span>
      </nav>

      <div className="mb-4 max-w-3xl">
        <DeliveryChargesNotice />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.map((item) => {
            const display = formatCartLineDisplay(item, "exclusive");
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-border p-4 flex gap-4">
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{item.brand}</p>
                  <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.name}</h4>
                  {item.variationLabel && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.variationLabel}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">per {item.unit}</p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center border border-border rounded-xl overflow-hidden">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2.5 py-1.5 hover:bg-muted transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-semibold border-x border-border min-w-[2.5rem] text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2.5 py-1.5 hover:bg-muted transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span style={{ color: "var(--sb-orange)" }} className="font-bold tabular-nums">
                        ₹{display.lineTotal.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        @ ₹{display.unitPrice.toLocaleString("en-IN")} / {item.unit} · {display.priceSuffix}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 self-start">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <CartOrderSummary
          itemCount={cart.length}
          summary={summary}
          coupon={coupon}
          onCouponChange={setCoupon}
          couponApplied={couponApplied}
          onApplyCoupon={applyCoupon}
          footer={
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  navigate("/login", { state: { from: { pathname: "/checkout" } } });
                  return;
                }
                navigate("/checkout");
              }}
              style={{ backgroundColor: "var(--sb-orange)" }}
              className="w-full mt-5 py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </button>
          }
          extraBelowTotal={
            <Link to="/category/cement" className="block text-center mt-3 text-sm text-muted-foreground hover:text-foreground">
              Continue Shopping
            </Link>
          }
        />
      </div>
    </div>
  );
}
