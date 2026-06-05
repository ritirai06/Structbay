import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, MapPin, Building2, CreditCard, Shield, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

const CITIES = ["Bengaluru", "Hyderabad", "Chennai"];

export function Checkout() {
  const { cart, cartTotal, city, isLoggedIn } = useApp();
  const navigate = useNavigate();
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

  const gst = Math.round(cartTotal * 0.18);
  const delivery = cartTotal >= 10000 ? 0 : 350;
  const total = cartTotal + gst + delivery;

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePlaceOrder = () => {
    if (form.deliveryCity && city && form.deliveryCity !== city) {
      setCityError(true);
      return;
    }
    navigate("/order-success");
  };

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
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? "text-white" : "bg-muted text-muted-foreground"}`}
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
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {cityError && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Currently StructBay is not serving this location. Please select {city}.
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Pincode</label>
                    <input
                      type="text"
                      value={form.pincode}
                      onChange={e => update("pincode", e.target.value)}
                      placeholder="560001"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background focus:outline-none"
                    />
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
                    <p className="text-xs text-muted-foreground">×{item.qty} {item.unit}</p>
                    <p className="text-xs font-bold" style={{ color: "var(--sb-blue)" }}>₹{(item.price * item.qty).toLocaleString()}</p>
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
            <button
              onClick={handlePlaceOrder}
              style={{ backgroundColor: "var(--sb-orange)" }}
              className="w-full mt-5 py-3.5 rounded-2xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Place Order ₹{total.toLocaleString()}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              By placing the order, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
