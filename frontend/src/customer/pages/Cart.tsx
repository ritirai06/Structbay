import { Link, useNavigate } from "react-router";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useState } from "react";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";

export function Cart() {
  const { cart, removeFromCart, updateQty, cartTotal, isLoggedIn } = useApp();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const gst = Math.round(cartTotal * 0.18);
  const deliveryCharge = cartTotal >= 10000 ? 0 : 350;
  const discount = couponApplied ? Math.round(cartTotal * 0.05) : 0;
  const finalTotal = cartTotal + gst + deliveryCharge - discount;

  const applyCoupon = () => {
    if (coupon.toUpperCase() === "SB5") setCouponApplied(true);
    else alert("Invalid coupon code. Try SB5 for 5% off.");
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div style={{ backgroundColor: "var(--sb-blue)" }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-sb-cream" />
        </div>
        <h2 className="text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add construction materials to get started</p>
        <Link to="/category/cement" style={{ backgroundColor: "var(--sb-blue)" }} className="inline-flex items-center gap-2 text-sb-cream px-6 py-3 rounded-2xl font-semibold hover:opacity-90">
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
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-border p-4 flex gap-4">
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.brand}</p>
                <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">per {item.unit}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2.5 py-1.5 hover:bg-muted transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-semibold border-x border-border min-w-[2.5rem] text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2.5 py-1.5 hover:bg-muted transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span style={{ color: "var(--sb-blue)" }} className="font-bold">₹{(item.price * item.qty).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 self-start">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-2xl border border-border p-5 sticky top-24">
            <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({cart.length} items)</span>
                <span className="font-medium">₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>₹{gst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className={deliveryCharge === 0 ? "text-green-600 font-medium" : ""}>{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
              </div>
              {couponApplied && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon (SB5)</span>
                  <span>-₹{discount.toLocaleString()}</span>
                </div>
              )}
              {deliveryCharge > 0 && (
                <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  Add ₹{(10000 - cartTotal).toLocaleString()} more for free delivery
                </p>
              )}
              <hr className="border-border" />
              <div className="flex justify-between font-bold text-base">
                <span>Total (incl. GST)</span>
                <span style={{ color: "var(--sb-blue)" }}>₹{finalTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Enter coupon (try SB5)"
                    className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={applyCoupon}
                  style={{ backgroundColor: couponApplied ? "var(--sb-green, #16a34a)" : "var(--sb-blue)" }}
                  className="px-3 py-2.5 rounded-xl text-sb-cream text-sm font-medium"
                  disabled={couponApplied}
                >
                  {couponApplied ? "Applied" : "Apply"}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (!isLoggedIn) {
                  navigate("/login", { state: { from: { pathname: "/checkout" } } });
                  return;
                }
                navigate("/checkout");
              }}
              style={{ backgroundColor: "var(--sb-orange)" }}
              className="w-full mt-5 py-3.5 rounded-2xl text-sb-cream font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </button>

            <div className="mt-3">
              <DeliveryChargesNotice />
            </div>

            <Link to="/category/cement" className="block text-center mt-3 text-sm text-muted-foreground hover:text-foreground">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
