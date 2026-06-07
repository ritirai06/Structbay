import { Link } from "react-router";
import { CheckCircle2, Circle, Package, Truck, Home, Download, Phone, ChevronRight, Clock, AlertCircle, Zap, Star } from "lucide-react";

const ALL_STATUSES = [
  "Order Placed",
  "Order Processing",
  "Vendor Assignment",
  "Ready for Dispatch",
  "Dispatched",
  "Out for Delivery",
  "Fully Delivered",
  "Completed",
];

const CURRENT_STATUS = "Out for Delivery";
const CURRENT_IDX    = ALL_STATUSES.indexOf(CURRENT_STATUS);

const STATUS_TIMES: Record<string, string> = {
  "Order Placed":      "Dec 15, 2025 · 10:32 AM",
  "Order Processing":  "Dec 15, 2025 · 11:45 AM",
  "Vendor Assignment": "Dec 15, 2025 · 2:00 PM",
  "Ready for Dispatch":"Dec 16, 2025 · 9:00 AM",
  "Dispatched":        "Dec 16, 2025 · 3:30 PM",
  "Out for Delivery":  "Dec 17, 2025 · 8:30 AM",
};

const STATUS_ICONS: Record<string, typeof Package> = {
  "Order Placed":       Package,
  "Order Processing":   Zap,
  "Vendor Assignment":  Star,
  "Ready for Dispatch": Package,
  "Dispatched":         Truck,
  "Out for Delivery":   Truck,
  "Fully Delivered":    Home,
  "Completed":          CheckCircle2,
};

const ORDER_ITEMS = [
  { name: "Ultratech OPC 53 Grade Cement", qty: "10 bags", price: "₹3,850" },
  { name: "TATA Tiscon Fe 500D TMT Bar 12mm", qty: "2 MT", price: "₹1,17,000" },
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

      {/* Order Header */}
      <div style={{ background: "linear-gradient(135deg, var(--sb-blue) 0%, #2d5fa3 100%)" }} className="rounded-2xl p-5 text-white mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-sm">Order ID</p>
            <p className="font-bold text-lg">SB-24119873</p>
            <p className="text-white/70 text-sm mt-1">Placed on Dec 15, 2025</p>
          </div>
          <div className="text-right">
            <div style={{ backgroundColor: "var(--sb-yellow, #F5A623)" }} className="text-black text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              <Truck className="w-3 h-3" /> {CURRENT_STATUS}
            </div>
            <p className="text-white/70 text-sm mt-2">Grand Total: ₹1,45,850</p>
            <p className="text-white/50 text-xs mt-0.5">incl. GST (18%)</p>
          </div>
        </div>
      </div>

      {/* Delivery charges notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>Note:</strong> Additional Delivery Charges Applicable. Charges To Be Paid At Site.</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-5">Shipment Timeline</h3>
          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
            <div className="space-y-5 relative">
              {ALL_STATUSES.map((status, i) => {
                const isDone   = i < CURRENT_IDX;
                const isActive = i === CURRENT_IDX;
                const Icon     = STATUS_ICONS[status] || Circle;
                return (
                  <div key={status} className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      isDone   ? "bg-green-500" :
                      isActive ? "border-2 border-orange-500 bg-white" :
                      "border-2 border-border bg-white"
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`font-semibold text-sm ${isDone || isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {status}
                        {isActive && <span style={{ color: "var(--sb-orange)" }} className="text-xs ml-2">(Current)</span>}
                      </p>
                      {STATUS_TIMES[status] && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {STATUS_TIMES[status]}
                        </p>
                      )}
                      {!STATUS_TIMES[status] && !isDone && (
                        <p className="text-xs text-muted-foreground/50 mt-0.5">Pending</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-5 bg-muted rounded-xl p-3 text-sm">
            <p className="font-medium text-foreground">Delivery Note</p>
            <p className="text-muted-foreground text-xs mt-1">
              Ensure someone is available at the site to receive materials and sign the delivery challan.
              Additional delivery charges (unloading, crane, pump etc.) will be collected at site.
            </p>
          </div>
        </div>

        {/* Order Details + Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Order Items</h3>
            <div className="space-y-3">
              {ORDER_ITEMS.map(item => (
                <div key={item.name} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                  </div>
                  <p className="font-bold" style={{ color: "var(--sb-blue)" }}>{item.price}</p>
                </div>
              ))}
            </div>
            <hr className="border-border my-3" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹1,23,600</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span>₹22,250</span></div>
              <div className="flex justify-between font-bold"><span>Grand Total</span><span style={{ color: "var(--sb-blue)" }}>₹1,45,850</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3">Delivery Address</h3>
            <p className="text-sm font-medium text-foreground">Kumar Constructions Pvt. Ltd.</p>
            <p className="text-sm text-muted-foreground mt-1">Plot 45, Whitefield Industrial Area</p>
            <p className="text-sm text-muted-foreground">Bengaluru, Karnataka – 560066</p>
          </div>

          <div className="space-y-2">
            <button className="w-full flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 hover:bg-muted transition-colors">
              <span className="flex items-center gap-2 text-sm font-medium"><Download className="w-4 h-4" /> Download Invoice</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3 hover:bg-muted transition-colors text-muted-foreground">
              <span className="flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Download E-Way Bill</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-lg">After dispatch</span>
            </button>
            <a
              href="tel:+918045678900"
              className="w-full flex items-center justify-center gap-2 border-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              style={{ borderColor: "var(--sb-blue)", color: "var(--sb-blue)" }}
            >
              <Phone className="w-4 h-4" /> Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
