import { Link } from "react-router";
import { CheckCircle2, Download, Package, ArrowRight, Share2 } from "lucide-react";

const ORDER_ID = `SB-${Date.now().toString().slice(-8)}`;

export function OrderSuccess() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Success animation */}
      <div className="relative mb-8">
        <div style={{ backgroundColor: "var(--sb-green, #16a34a)" }} className="w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-14 h-14 text-white" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ borderColor: "var(--sb-green, #16a34a)" }} className="w-32 h-32 rounded-full border-4 opacity-30 animate-ping" />
        </div>
      </div>

      <h1 className="text-foreground mb-2">Order Placed Successfully!</h1>
      <p className="text-muted-foreground mb-6">
        Your order has been confirmed. You'll receive a confirmation on your registered email and phone number.
      </p>

      <div style={{ backgroundColor: "var(--sb-blue)" }} className="rounded-2xl p-6 text-white mb-4">
        <p className="text-white/70 text-sm mb-1">Order Number</p>
        <p className="font-bold text-2xl tracking-wide">{ORDER_ID}</p>
        <p className="text-white/70 text-sm mt-2">Expected Delivery: 2–4 Business Days</p>
      </div>

      {/* Delivery charges notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800 text-left">
        <span className="shrink-0 mt-0.5">⚠️</span>
        <span><strong>Delivery Charges Notice:</strong> Additional Delivery Charges Applicable. Charges To Be Paid At Site.</span>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 mb-6 text-left">
        <h3 className="font-semibold mb-4 text-foreground">What's Next?</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Order Confirmed", desc: "Your order is being processed by our team.", done: true },
            { step: "2", title: "Quality Check", desc: "Products are inspected at our warehouse.", done: false },
            { step: "3", title: "Dispatch", desc: "Your order will be dispatched within 24 hours.", done: false },
            { step: "4", title: "Delivery", desc: "Delivered to your site address.", done: false },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                style={{ backgroundColor: item.done ? "var(--sb-green, #16a34a)" : "var(--sb-blue)" }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
              >
                {item.step}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 border border-border rounded-2xl py-3 text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Download Invoice
        </button>
        <Link
          to="/track"
          style={{ backgroundColor: "var(--sb-blue)" }}
          className="flex-1 flex items-center justify-center gap-2 text-white rounded-2xl py-3 text-sm font-semibold hover:opacity-90"
        >
          <Package className="w-4 h-4" /> Track Order
        </Link>
        <Link
          to="/"
          style={{ backgroundColor: "var(--sb-orange)" }}
          className="flex-1 flex items-center justify-center gap-2 text-white rounded-2xl py-3 text-sm font-semibold hover:opacity-90"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
