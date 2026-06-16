import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, MapPin, Building2, CreditCard, Shield, AlertCircle, CheckCircle2, Plus, Minus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { loadStorefrontCities } from "../lib/storefrontCities";
import { pushClientCartToServer } from "../lib/pushClientCartToServer";
import { DeliveryChargesNotice } from "@shared/components/DeliveryChargesNotice";
import { deliveryCityMatchesSelected, normalizeCityName } from "../../lib/cityNameMatch";

export function Checkout() {
  const { cart, cartTotal, city, cityId, isLoggedIn, clearClientCart, updateQty } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: { pathname: "/checkout" } }, replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (city) {
      setForm(f => ({ ...f, deliveryCity: f.deliveryCity || city }));
    }
  }, [city]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb_customer_profile");
      if (!raw) return;
      const p = JSON.parse(raw) as Record<string, string>;
      setForm(f => ({
        ...f,
        companyName: f.companyName || p.company || "",
        gstNumber: f.gstNumber || p.gst || "",
        contactName: f.contactName || p.name || "",
        phone: f.phone || p.mobile || "",
        email: f.email || p.email || "",
        address: f.address || p.billingAddress || "",
      }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sb_checkout_prefill");
      if (!raw) return;
      const p = JSON.parse(raw) as Record<string, string>;
      sessionStorage.removeItem("sb_checkout_prefill");
      setForm(f => ({
        ...f,
        contactName: f.contactName || p.name || "",
        phone: f.phone || p.phone || "",
        address: f.address || [p.line1, p.city, p.state, p.pincode].filter(Boolean).join(", ") || f.address,
        deliveryCity: f.deliveryCity || p.city || f.deliveryCity,
        pincode: f.pincode || p.pincode || f.pincode,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: "",
    gstNumber: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    deliveryCity: city || "",
    pincode: "",
    paymentMethod: "online",
  });
  const [cityError, setCityError] = useState(false);
  const [deliveryCityNames, setDeliveryCityNames] = useState<string[]>([]);
  const [serviceCities, setServiceCities] = useState<{ id: string; name: string }[]>([]);
  const [pincodeCheck, setPincodeCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await loadStorefrontCities();
        if (cancelled) return;
        setServiceCities(list.filter((c) => c.id && c.name).map((c) => ({ id: c.id, name: c.name })));
        setDeliveryCityNames(list.map((c) => c.name).filter(Boolean));
      } catch {
        if (!cancelled) {
          setDeliveryCityNames([]);
          setServiceCities([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const gst = Math.round(cartTotal * 0.18);
  const delivery = cartTotal >= 10000 ? 0 : 350;
  const total = cartTotal + gst + delivery;

  /** Mongo city id: header selection, else match delivery dropdown to `/cities` list (PIN + checkout APIs need this). */
  const resolvedWarehouseCityId = useMemo(() => {
    if (cityId) return cityId;
    const key = normalizeCityName(form.deliveryCity);
    if (!key || serviceCities.length === 0) return null;
    const hit = serviceCities.find((c) => normalizeCityName(c.name) === key);
    return hit?.id ?? null;
  }, [cityId, form.deliveryCity, serviceCities]);

  const update = (k: string, v: string) => {
    if (k === "pincode") setPincodeCheck(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const verifyDeliveryPincode = async () => {
    const digits = form.pincode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setPincodeCheck(null);
      return;
    }
    setPincodeChecking(true);
    try {
      const d = await api.validatePincode(digits, resolvedWarehouseCityId);
      if (d.serviceable && d.city) {
        setPincodeCheck({
          ok: true,
          message: `This PIN is in our service area for ${d.city.name}.`,
        });
      } else {
        setPincodeCheck({
          ok: false,
          message: d.message || "This PIN code is not in our active service area.",
        });
      }
    } catch {
      setPincodeCheck({
        ok: false,
        message: "We could not verify this PIN. Please try again in a moment.",
      });
    } finally {
      setPincodeChecking(false);
    }
  };

  const handlePlaceOrder = async () => {
    setOrderError(null);
    if (form.deliveryCity && city && !deliveryCityMatchesSelected(city, form.deliveryCity)) {
      setCityError(true);
      return;
    }
    const digits = form.pincode.replace(/\D/g, "");
    if (digits.length === 6) {
      try {
        const d = await api.validatePincode(digits, resolvedWarehouseCityId);
        if (!d.serviceable) {
          setPincodeCheck({
            ok: false,
            message: d.message || "This PIN code is not in our active service area.",
          });
          return;
        }
        setPincodeCheck({
          ok: true,
          message: d.city ? `Delivery available for ${d.city.name}.` : "This PIN is in our service area.",
        });
      } catch {
        setPincodeCheck({
          ok: false,
          message: "We could not verify this PIN. Please try again.",
        });
        return;
      }
    }

    if (!form.contactName.trim() || !form.phone.trim() || !form.address.trim() || !form.deliveryCity.trim()) {
      setOrderError("Please complete contact name, phone, full delivery address, and delivery city.");
      return;
    }
    if (digits.length !== 6) {
      setOrderError("Enter a valid 6-digit delivery PIN code.");
      return;
    }
    if (!resolvedWarehouseCityId) {
      setOrderError(
        "Choose a delivery city from the list (or set your warehouse city in the header). Pricing and checkout need a serviceable city."
      );
      return;
    }

    setPlacingOrder(true);
    try {
      await api.clearCart();
      await api.setCartCity({ cityId: resolvedWarehouseCityId });
      await pushClientCartToServer(cart, resolvedWarehouseCityId);
      await api.validateCheckout({ cityId: resolvedWarehouseCityId, addressCity: form.deliveryCity });
      const line2 = [form.companyName.trim(), form.gstNumber.trim() ? `GSTIN: ${form.gstNumber.trim()}` : ""]
        .filter(Boolean)
        .join(" · ");
      const res = await api.placeOrder({
        cityId: resolvedWarehouseCityId,
        shippingAddress: {
          name: form.contactName.trim(),
          phone: form.phone.trim(),
          line1: form.address.trim(),
          line2: line2 || undefined,
          city: form.deliveryCity.trim(),
          state: "",
          pincode: digits,
        },
        paymentMethod: form.paymentMethod,
      });
      const order = res?.data as { _id?: string; id?: string; orderNumber?: string } | undefined;
      const placedId = order?._id ?? order?.id;
      if (!placedId) {
        throw new Error("Order response was incomplete. Check My Orders or try again.");
      }
      clearClientCart();
      navigate(
        { pathname: "/order-success", search: `?orderId=${encodeURIComponent(String(placedId))}` },
        { state: { order: { ...order, _id: String(placedId) } } }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not place order.";
      setOrderError(msg);
      try {
        await api.clearCart();
      } catch {
        /* ignore */
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-muted-foreground">
        Sign in is required to checkout. Redirecting…
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link to="/" className="text-primary underline">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4 max-w-3xl">
        <DeliveryChargesNotice />
      </div>
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/cart" className="hover:text-foreground">Cart</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Checkout</span>
      </nav>

      {/* Progress */}
      <div className="flex items-center gap-4 mb-8">
        {[{ n: 1, label: "Billing" }, { n: 2, label: "Delivery" }, { n: 3, label: "Payment" }].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div
              style={{ backgroundColor: step >= n ? "var(--sb-blue)" : undefined }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? "text-sb-cream" : "bg-muted text-muted-foreground"}`}
            >
              {n}
            </div>
            <span className={`text-sm font-medium ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {n < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Billing Info */}
          {step >= 1 && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5" style={{ color: "var(--sb-blue)" }} /> Billing Information
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Company Name", key: "companyName", placeholder: "Your Construction Company" },
                  { label: "GST Number", key: "gstNumber", placeholder: "29AABCS1234B1Z5" },
                  { label: "Contact Name", key: "contactName", placeholder: "Full name" },
                  { label: "Phone Number", key: "phone", placeholder: "+91 98765 43210" },
                  { label: "Email", key: "email", placeholder: "email@company.com" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={form[key as keyof typeof form]}
                      onChange={e => update(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Address */}
          {step >= 1 && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5" style={{ color: "var(--sb-orange)" }} /> Delivery Address
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => update("address", e.target.value)}
                    placeholder="Site address, landmark..."
                    rows={3}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Delivery City</label>
                    <select
                      value={form.deliveryCity}
                      onChange={e => { update("deliveryCity", e.target.value); setCityError(false); }}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none"
                    >
                      <option value="">Select city</option>
                      {[...new Set([...(city && !deliveryCityNames.includes(city) ? [city] : []), ...deliveryCityNames])].map(
                        (n) => (
                          <option key={n} value={n}>{n}</option>
                        )
                      )}
                    </select>
                    {cityError && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Checkout blocked: delivery city must match your selected shopping city ({city}). Pricing and stock are city-specific — go to City Selection if you need a different location.
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Pincode</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={e => update("pincode", e.target.value)}
                      onBlur={() => void verifyDeliveryPincode()}
                      placeholder="560001"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none"
                    />
                    {pincodeChecking && (
                      <p className="text-xs text-muted-foreground mt-2">Checking PIN…</p>
                    )}
                    {pincodeCheck && !pincodeChecking && (
                      <div className={`flex items-start gap-1.5 mt-2 text-xs leading-relaxed ${pincodeCheck.ok ? "text-green-700" : "text-amber-800"}`}>
                        {pincodeCheck.ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                        )}
                        {pincodeCheck.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          {step >= 1 && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" style={{ color: "var(--sb-blue)" }} /> Payment Method
              </h3>
              <div className="space-y-3">
                {[
                  { id: "online", label: "Online Payment (UPI, Cards, NetBanking)", sub: "Powered by Zoho Payments" },
                  { id: "credit", label: "Buy on Credit", sub: "Pay within 30 days (StructBay Finance)" },
                  { id: "cod", label: "Cash on Delivery", sub: "For orders below ₹50,000" },
                ].map(opt => (
                  <label key={opt.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.paymentMethod === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <input
                      type="radio"
                      name="payment"
                      value={opt.id}
                      checked={form.paymentMethod === opt.id}
                      onChange={() => update("paymentMethod", opt.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-3">
                <Shield className="w-4 h-4 shrink-0" style={{ color: "var(--sb-blue)" }} />
                Your payment is secured by 256-bit SSL encryption. We never store card details.
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Checkout collects the <strong className="text-foreground">full order value in one payment</strong> via Zoho Payments when you pay online (no partial payments). Status will appear as Pending until the gateway confirms Paid or Failed.
              </p>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-2xl border border-border p-5 sticky top-24">
            <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2 text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.unit}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="inline-flex items-stretch rounded-lg border border-border overflow-hidden bg-muted/40">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-7 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] px-1 flex items-center justify-center text-xs font-bold tabular-nums border-x border-border">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-7 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-bold mt-1" style={{ color: "var(--sb-blue)" }}>₹{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <hr className="border-border mb-3" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{cartTotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>₹{gst.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className={delivery === 0 ? "text-green-600" : ""}>{delivery === 0 ? "FREE" : `₹${delivery}`}</span></div>
              <hr className="border-border" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span style={{ color: "var(--sb-blue)" }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
            {orderError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                <span>{orderError}</span>
              </div>
            )}
            <button
              type="button"
              disabled={placingOrder}
              onClick={() => void handlePlaceOrder()}
              style={{ backgroundColor: "var(--sb-orange)" }}
              className="w-full mt-5 py-3.5 rounded-2xl text-sb-cream font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:pointer-events-none"
            >
              {placingOrder ? "Placing order…" : `Place Order ₹${total.toLocaleString()}`}
            </button>
            <div className="mt-3">
              <DeliveryChargesNotice />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              By placing the order, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
