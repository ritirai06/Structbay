import { Link, useNavigate } from "react-router";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ChevronRight, AlertCircle, CheckCircle2, ShoppingCart } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useMemo, useState, useEffect } from "react";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";
import { CartOrderSummary } from "../components/CartOrderSummary";
import {
  buildCartSummaryFromLines,
  formatCartLineDisplay,
  lineSubtotalExGst,
} from "../lib/cartTotals";
import { productHref } from "../lib/productRoutes";
import { listingUnitPrice, pricingSnapshotFromProduct, resolveUnitPriceFromSnapshot } from "../lib/wholesalePricing";
import { displayUnitFromExGst } from "../lib/displayPricing";
import { firstImageUrl } from "../lib/productAttributes";

// Default minimum order value (₹2,000) - will be fetched from API
const DEFAULT_MINIMUM_ORDER_VALUE = 2000;

export function Cart() {
  const { cart, removeFromCart, updateQty, isLoggedIn, addToCart, cityId } = useApp();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number>(DEFAULT_MINIMUM_ORDER_VALUE);
  const [upsells, setUpsells] = useState<any[]>([]);

  // Fetch minimum order value from API
  useEffect(() => {
    const fetchMinOrderValue = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || '/api/v1';
        const res = await fetch(`${base}/cms/commerce-settings`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.minimumOrderValue != null) {
            const val = Number(json.data.minimumOrderValue);
            if (!isNaN(val) && val > 0) {
              setMinimumOrderValue(val);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch minimum order value:', error);
      }
    };
    fetchMinOrderValue();
  }, []);

  // Fetch upsell products based on cart product IDs and city
  useEffect(() => {
    if (cart.length === 0) {
      setUpsells([]);
      return;
    }
    const productIds = cart
      .map(item => item.productId || '')
      .filter(Boolean);
    if (productIds.length === 0) return;
    const query = productIds.join(',');
    fetch(`/api/v1/product-relationships/upsell?productIds=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(async json => {
        if (json.success && Array.isArray(json.data)) {
          // Filter out products already in cart
          const cartProductIds = new Set(cart.map(item => item.productId).filter(Boolean));
          const upsellIds = json.data
            .filter((p: any) => {
              // Exclude if any cart item matches this upsell product's _id
              return (
                p.status === 'ACTIVE' &&
                !cart.some(cartItem => String(cartItem.productId) === String(p._id))
              );
            })
            .map((p: any) => p.slug || p._id)
            .filter(Boolean);
          // Fetch full product details for each upsell product, passing cityId for city-wise pricing
          const upsellDetails = await Promise.all(
            upsellIds.map(async (slugOrId: string) => {
              try {
                const res = await import("../lib/api").then(m => m.api.getProductDetails(slugOrId, cityId));
                return res.data || null;
              } catch {
                return null;
              }
            })
          );
          setUpsells(upsellDetails.filter(Boolean));
        }
      })
      .catch(() => {});
  }, [cart, cityId]);

  const summary = useMemo(
    () => buildCartSummaryFromLines(cart, "exclusive", appliedCoupon),
    [cart, appliedCoupon]
  );

  const cartSubtotal = summary.displaySubtotal;
  const meetsMinimumOrder = cartSubtotal >= minimumOrderValue;
  const remainingAmount = Math.max(0, minimumOrderValue - cartSubtotal);
  const progressPercentage = Math.min(100, Math.round((cartSubtotal / minimumOrderValue) * 100));

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const base = import.meta.env.VITE_API_URL || '/api/v1';
      const res = await fetch(`${base}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon, cartValue: summary.subtotalExGst })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.data);
      } else {
        alert(data.message || 'Invalid Coupon Code');
        setAppliedCoupon(null);
      }
    } catch (err) {
      alert('Error validating coupon. Please try again.');
      setAppliedCoupon(null);
    }
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

  const handleCheckout = () => {
    if (!meetsMinimumOrder) {
      alert(`Minimum order value is ₹${minimumOrderValue.toLocaleString('en-IN')}. Add ₹${remainingAmount.toLocaleString('en-IN')} more to continue.`);
      return;
    }
    if (!isLoggedIn) {
      navigate("/login", { state: { from: { pathname: "/checkout" }, coupon: appliedCoupon } });
      return;
    }
    navigate("/checkout", { state: { coupon: appliedCoupon } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Cart ({cart.length} items)</span>
      </nav>

      {/* Minimum Order Value Banner */}
      <div className={`mb-6 rounded-2xl border p-4 ${
        meetsMinimumOrder 
          ? 'bg-green-50 border-green-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          {meetsMinimumOrder ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {meetsMinimumOrder ? (
              <>
                <p className="font-semibold text-green-800">Minimum order requirement met!</p>
                <p className="text-sm text-green-700 mt-0.5">You can proceed to checkout.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-800">
                  Add ₹{remainingAmount.toLocaleString('en-IN')} more to reach the minimum order value of ₹{minimumOrderValue.toLocaleString('en-IN')}.
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {progressPercentage < 50 
                    ? `You're ${100 - progressPercentage}% away from checkout eligibility.`
                    : `You're only ₹${remainingAmount.toLocaleString('en-IN')} away from placing your order!`
                  }
                </p>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className={meetsMinimumOrder ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
              ₹{cartSubtotal.toLocaleString('en-IN')} / ₹{minimumOrderValue.toLocaleString('en-IN')}
            </span>
            <span className={meetsMinimumOrder ? 'text-green-700' : 'text-amber-700'}>
              {progressPercentage}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                meetsMinimumOrder ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

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
<button onClick={() => updateQty(item.id, Number(item.qty || 1) - 1)} className="px-2.5 py-1.5 hover:bg-muted transition-colors" aria-label="Decrease quantity">
  <Minus className="w-3.5 h-3.5" />
</button>
<input
  type="text"
  value={item.qty}
  onChange={(e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    updateQty(item.id, val ? Number(val) : ("" as any));
  }}
  onBlur={(e) => {
    const val = Number(e.target.value);
    if (!val || val < 1) {
      if (window.confirm("Do you want to remove this item from the cart?")) {
        removeFromCart(item.id);
      } else {
        updateQty(item.id, 1);
      }
    } else {
      updateQty(item.id, val);
    }
  }}
  className="w-12 text-center bg-transparent border-x border-border focus:outline-none focus:ring-0 p-0 text-sm font-semibold"
/>
<button onClick={() => updateQty(item.id, Number(item.qty || 1) + 1)} className="px-2.5 py-1.5 hover:bg-muted transition-colors" aria-label="Increase quantity">
  <Plus className="w-3.5 h-3.5" />
</button>
                    </div>
                    <div>
                      <span style={{ color: "var(--sb-orange)" }} className="font-bold tabular-nums">
                        ₹{display.lineTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        @ ₹{display.unitPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })} / {item.unit} · {display.priceSuffix}
                      </span>
                    </div>
                  </div>
                </div>
<button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 self-start" aria-label="Remove from cart">
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
          couponApplied={!!appliedCoupon}
          onApplyCoupon={applyCoupon}
          footer={
            <>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={!meetsMinimumOrder}
                className={`w-full mt-5 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  meetsMinimumOrder
                    ? 'text-white hover:opacity-90'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={meetsMinimumOrder ? { backgroundColor: "var(--sb-orange)" } : {}}
              >
                Proceed to Checkout <ArrowRight className="w-5 h-5" />
              </button>
              {!meetsMinimumOrder && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Minimum order value is ₹{minimumOrderValue.toLocaleString('en-IN')}. 
                  Add ₹{remainingAmount.toLocaleString('en-IN')} more to continue.
                </p>
              )}
            </>
          }
          extraBelowTotal={
            <Link to="/category/cement" className="block text-center mt-3 text-sm text-muted-foreground hover:text-foreground">
              Continue Shopping
            </Link>
          }
        />
      </div>

      {/* Upsell: You May Also Like */}
      {upsells.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-foreground mb-5">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {upsells.slice(0, 8).map((p: any) => {
              const vid = p.variations?.[0]?._id ? String(p.variations[0]._id) : null;
              const snap = pricingSnapshotFromProduct(p, vid);
              const unitEx = snap ? resolveUnitPriceFromSnapshot(snap, 1) : listingUnitPrice(p, vid);
              const displayUnit = displayUnitFromExGst(unitEx, p);
              const mrpEx = snap?.regularPrice ?? unitEx;
              const displayMrp = displayUnitFromExGst(mrpEx, p);
              const discount = displayMrp > displayUnit ? Math.round((1 - displayUnit / displayMrp) * 100) : 0;
              const img = firstImageUrl(p.images);
              const pslug = p.slug || p._id;
              return (
                <div key={p._id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow group">
                  <Link to={productHref(pslug)} className="block">
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 z-10 bg-[#E85A00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {discount}% OFF
                        </span>
                      )}
                      {img ? (
                        <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] text-muted-foreground mb-0.5">{p.brand?.name || ''}</p>
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-2">{p.name}</p>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold text-[#E85A00] text-sm">
                          ₹{Number(displayUnit).toLocaleString('en-IN')}
                        </span>
                        {discount > 0 && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{Number(displayMrp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        const cartId = `${pslug}::base`;
                        addToCart({
                          id: cartId,
                          productSlug: pslug,
                          productId: p._id,
                          name: p.name,
                          brand: p.brand?.name || '',
                          price: unitEx,
                          qty: 1,
                          unit: p.unit || 'unit',
                          image: img || '',
                          pricingSnapshot: snap,
                          gstPercentage: p.gstPercentage ?? 18,
                          gstType: p.priceIncludesGst ? "inclusive" : "exclusive",
                        });
                      }}
                      className="w-full py-2 text-sm font-semibold rounded-xl border-2 border-[#E85A00] text-[#E85A00] hover:bg-[#E85A00] hover:text-white transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
