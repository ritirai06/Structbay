import { Link } from "react-router";
import { CheckCircle2, Circle, Package, Truck, Home, Download, Phone, ChevronRight, Clock } from "lucide-react";

const STEPS = [
  { icon: Package, label: "Order Placed", time: "Dec 15, 2025 · 10:32 AM", done: true, active: false },
  { icon: CheckCircle2, label: "Processing", time: "Dec 15, 2025 · 11:45 AM", done: true, active: false },
  { icon: Package, label: "Ready to Dispatch", time: "Dec 16, 2025 · 9:00 AM", done: true, active: false },
  { icon: Truck, label: "Out for Delivery", time: "Dec 17, 2025 · 8:30 AM", done: false, active: true },
  { icon: Home, label: "Delivered", time: "Expected Dec 17, 2025", done: false, active: false },
];

const ORDER_ITEMS = [
  { name: "Ultratech OPC 53 Grade Cement", qty: "10 bags", price: "₹3,850" },
  { name: "TATA Tiscon Fe 500D TMT Bar", qty: "2 MT", price: "₹1,17,000" },
];

export function OrderTracking() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Track Order</span>
      </nav>

      <h1 className="text-foreground mb-6">Order Tracking</h1>

      {/* Order header */}
      <div style={{ background: "linear-gradient(135deg, var(--sb-blue) 0%, var(--sb-blue-light, #2d5fa3) 100%)" }} className="rounded-2xl p-5 text-white mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white/70 text-sm">Order ID</p>
            <p className="font-bold text-lg">SB-24119873</p>
            <p className="text-white/70 text-sm mt-1">Placed on Dec 15, 2025</p>
          </div>
          <div className="text-right">
            <div style={{ backgroundColor: "var(--sb-yellow)" }} className="text-black text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              <Truck className="w-3 h-3" /> Out for Delivery
            </div>
            <p className="text-white/70 text-sm mt-2">Total: ₹1,45,850</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-5">Shipment Timeline</h3>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

            <div className="space-y-6 relative">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      step.done
                        ? "bg-green-500"
                        : step.active
                        ? "border-2 border-orange-500 bg-white"
                        : "border-2 border-border bg-white"
                    }`}>
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : step.active ? (
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`font-semibold text-sm ${step.done || step.active ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                        {step.active && <span style={{ color: "var(--sb-orange)" }} className="text-xs ml-2">(Current)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {step.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery note */}
          <div className="mt-5 bg-muted rounded-xl p-3 text-sm">
            <p className="font-medium text-foreground">Delivery Note</p>
            <p className="text-muted-foreground text-xs mt-1">Ensure someone is available at the delivery address to receive the materials and sign the delivery challan.</p>
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Order Items</h3>
            <div className="space-y-3">
              {ORDER_ITEMS.map(item => (
                <div key={item.name} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.qty}</p>
                  </div>
                  <p className="font-bold" style={{ color: "var(--sb-blue)" }}>{item.price}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Delivery Address</h3>
            <p className="text-sm text-foreground font-medium">Kumar Constructions Pvt. Ltd.</p>
            <p className="text-sm text-muted-foreground mt-1">Plot 45, Whitefield Industrial Area, Bengaluru – 560066</p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 hover:bg-muted transition-colors">
              <span className="flex items-center gap-2 text-sm font-medium"><Download className="w-4 h-4" /> Download Invoice</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 hover:bg-muted transition-colors">
              <span className="flex items-center gap-2 text-sm font-medium"><Download className="w-4 h-4" /> Download E-Way Bill</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <a href="tel:+918045678900" className="w-full flex items-center justify-center gap-2 border-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted" style={{ borderColor: "var(--sb-blue)", color: "var(--sb-blue)" }}>
              <Phone className="w-4 h-4" /> Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
