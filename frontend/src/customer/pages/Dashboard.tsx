import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  LayoutDashboard, Package, FileText, MapPin, Bell, User as UserIcon,
  ChevronRight, ArrowRight, Download, RefreshCcw, TrendingUp, Clock,
  Truck, LogOut, Menu, X, Plus, Trash2, CheckCheck, Star,
  ShoppingBag, MessageSquare, ClipboardList, Zap, Home, Building2, MessageCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { clearCustomerSession } from "../lib/authStorage";

const ADDR_STORAGE = "sb_customer_addresses_v1";

type CustomerUiOrder = {
  id: string;
  dbId: string;
  date: string;
  items: string;
  total: string;
  status: string;
  statusClass: string;
};

type CustomerUiNotif = {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: string;
};

type CustomerUiAddress = {
  id: string;
  label: string;
  name: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",     key: "dashboard" },
  { icon: Package,         label: "My Orders",     key: "orders" },
  { icon: FileText,        label: "Invoices",      key: "invoices" },
  { icon: MapPin,          label: "Addresses",     key: "addresses" },
  { icon: Bell,            label: "Notifications", key: "notifications" },
  { icon: UserIcon,        label: "Profile",       key: "profile" },
];

function mapApiStatus(status: string): { label: string; cls: string } {
  if (["DELIVERED", "COMPLETED"].includes(status)) return { label: "Delivered", cls: "text-green-400" };
  if (status === "CANCELLED") return { label: "Cancelled", cls: "text-red-400" };
  if (status === "OUT_FOR_DELIVERY") return { label: "Out for Delivery", cls: "text-[#FE5E00]" };
  return { label: (status || "—").replace(/_/g, " "), cls: "text-sb-ink-muted/70" };
}

function mapApiOrder(o: any): CustomerUiOrder {
  const st = mapApiStatus(o.status || "");
  return {
    id: o.orderNumber || String(o._id),
    dbId: String(o._id),
    date: o.createdAt
      ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    items: Array.isArray(o.items) ? o.items.map((i: any) => `${i.name} ×${i.quantity}`).join(", ") : "—",
    total: `₹${Number(o.grandTotal || 0).toLocaleString("en-IN")}`,
    status: st.label,
    statusClass: st.cls,
  };
}

function mapApiNotif(n: any): CustomerUiNotif {
  const t = n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  return {
    id: String(n._id),
    title: n.title || "Notification",
    message: n.message || "",
    time: t,
    isRead: Boolean(n.isRead),
    type: n.type || "ORDER",
  };
}

const notifIcon: Record<string, string> = {
  ORDER: "🛍️", PAYMENT: "💳", DISPATCH: "🚚", DELIVERY: "✅", INVOICE: "🧾", ENQUIRY: "📋", RFQ: "📝", ANNOUNCEMENT: "📢",
};

/* ─── Sidebar ───────────────────────────────────────────── */
function Sidebar({ user, active, setActive, close, logout }: {
  user: any; active: string;
  setActive: (k: string) => void;
  close: () => void;
  logout: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-sb-page">
      <div className="p-5 border-b border-sb-ink/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FE5E00] flex items-center justify-center text-sb-on-orange font-bold text-lg shrink-0">
            {(user?.name?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sb-ink font-semibold text-sm truncate">{user?.name || "User"}</p>
            <p className="text-sb-ink-muted/50 text-xs truncate">{user?.company || "Customer"}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, key }) => (
          <button
            key={key}
            onClick={() => { setActive(key); close(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              active === key
                ? "bg-[#FE5E00]/15 text-[#FE5E00] font-semibold border-l-2 border-[#FE5E00] pl-[10px]"
                : "text-sb-ink-muted/70 hover:text-sb-ink hover:bg-sb-surface-2"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-sb-ink/10 space-y-1">
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sb-ink-muted/60 hover:text-sb-ink hover:bg-sb-surface-2 transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> Back to Store
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sb-ink-muted/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}

/* ─── Section: Dashboard Overview ───────────────────────── */
function DashboardHome({ user, setActive, orders, savedAddrCount }: { user: any; setActive: (k: string) => void; orders: CustomerUiOrder[]; savedAddrCount: number }) {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
  const widgets = [
    { label: "Total Orders",   value: String(totalOrders),    icon: Package,    accent: "bg-[#FE5E00]/15", iconColor: "text-[#FE5E00]" },
    { label: "Pending Orders", value: String(pendingOrders), icon: Clock,      accent: "bg-[#FE5E00]/15", iconColor: "text-[#FE5E00]" },
    { label: "Total Spent",    value: totalOrders ? "—" : "₹0", icon: TrendingUp, accent: "bg-green-500/15", iconColor: "text-green-400" },
    { label: "Active RFQs",    value: "0",     icon: FileText,   accent: "bg-[#C9A227]/15", iconColor: "text-[#C9A227]" },
    { label: "Bulk Enquiries", value: "0",     icon: MessageSquare, accent: "bg-blue-500/15", iconColor: "text-blue-400" },
    { label: "Saved Addresses",value: String(savedAddrCount),     icon: MapPin,     accent: "bg-purple-500/15", iconColor: "text-purple-400" },
  ];

  const quickActions = [
    { label: "Shop Materials",   icon: ShoppingBag,   to: "/shop",     color: "bg-[#FE5E00]" },
    { label: "Browse Categories",icon: ClipboardList, to: "/category/cement", color: "bg-[#1A3C5E]" },
    { label: "Bulk Enquiry",     icon: MessageSquare, to: "/bulk-enquiry", color: "bg-[#C9A227]" },
    { label: "Concrete RFQ",     icon: Zap,           to: "/rfq",      color: "bg-green-700" },
    { label: "My Orders",        icon: Package,       onClick: () => setActive("orders"), color: "bg-sb-surface-2 border border-sb-ink/12" },
    { label: "Download Invoices",icon: Download,      onClick: () => setActive("invoices"), color: "bg-sb-surface-2 border border-sb-ink/12" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-bold text-sb-ink">Good day, {user?.name?.split(" ")[0]}! 👋</p>
        <p className="text-sb-ink-muted/60 text-sm mt-0.5">Here's your procurement activity at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {widgets.map(({ label, value, icon: Icon, accent, iconColor }) => (
          <div key={label} className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-4 hover:border-sb-ink/18 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-sb-ink-muted/60 font-semibold uppercase tracking-wider leading-tight">{label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
            <p className="font-black text-xl text-sb-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-5">
        <h3 className="font-semibold text-sb-ink text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(({ label, icon: Icon, to, onClick, color }) => {
            const cls = `flex flex-col items-center gap-2 p-3 rounded-xl ${color} hover:opacity-90 transition-opacity cursor-pointer`;
            const inner = (
              <>
                <Icon className="w-5 h-5 text-sb-cream" />
                <span className="text-[10px] font-semibold text-sb-cream text-center leading-tight">{label}</span>
              </>
            );
            return to ? (
              <Link key={label} to={to} className={cls}>{inner}</Link>
            ) : (
              <button key={label} onClick={onClick} className={cls}>{inner}</button>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-semibold text-sb-ink text-sm">Recent Orders</h3>
          <button onClick={() => setActive("orders")} className="text-sm font-medium text-[#FE5E00] hover:text-[#E05200] flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-sb-ink-muted/50">No orders yet. Browse the store and place your first order.</div>
          ) : (
          orders.slice(0, 3).map(order => (
            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-sb-ink/[0.03]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/15 flex items-center justify-center mt-0.5 shrink-0">
                  <Package className="w-4 h-4 text-[#FE5E00]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-sb-ink">{order.id}</p>
                  <p className="text-xs text-sb-ink-muted/60">{order.items}</p>
                  <p className="text-xs text-sb-ink-muted/40">{order.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-sb-ink">{order.total}</p>
                <span className={`text-xs font-semibold ${order.statusClass}`}>{order.status}</span>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Quick Reorder */}
      <div className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-5">
        <h3 className="font-semibold text-sb-ink text-sm mb-4">Quick Reorder</h3>
        <p className="text-sm text-sb-ink-muted/60">Your frequently ordered items will appear here once you have order history.</p>
        <Link to="/shop" className="inline-flex mt-4 items-center gap-2 text-[#FE5E00] text-sm font-medium hover:underline">
          Browse shop <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Section: Orders ───────────────────────────────────── */
function OrdersSection({ orders }: { orders: CustomerUiOrder[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : orders.filter(o => {
    if (filter === "active") return !["Delivered", "Cancelled"].includes(o.status);
    if (filter === "delivered") return o.status === "Delivered";
    if (filter === "cancelled") return o.status === "Cancelled";
    return true;
  });

  const openInvoices = async (orderId: string) => {
    try {
      const res = await api.getOrderInvoices(orderId);
      const list = (res as { data?: { url?: string }[] }).data || [];
      const pdf = list.find(x => x.url);
      if (pdf?.url) window.open(pdf.url, "_blank", "noopener,noreferrer");
      else alert("No invoice PDF is available for this order yet.");
    } catch {
      alert("Could not load invoices. Ensure you are signed in with a valid customer session.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["all","All"],["active","Active"],["delivered","Delivered"],["cancelled","Cancelled"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === v ? "bg-[#FE5E00] text-sb-on-orange" : "bg-sb-surface-2 text-sb-ink-muted/70 border border-sb-ink/12 hover:border-sb-ink/18"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sb-ink-muted/50 text-sm">No orders to show.</div>
      ) : (
      <div className="max-h-[min(72vh,800px)] overflow-y-auto space-y-4 pr-1 -mr-1">
      {filtered.map(order => (
        <div key={order.dbId} className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-4 hover:border-sb-ink/18 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-sb-ink">{order.id}</p>
              <p className="text-sm text-sb-ink-muted/70">{order.items}</p>
              <p className="text-xs text-sb-ink-muted/40 mt-1">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sb-ink">{order.total}</p>
              <span className={`text-sm font-semibold ${order.statusClass}`}>{order.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t border-sb-ink/10">
            <Link
              to={`/orders/${order.dbId}`}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-sb-ink/12 hover:border-[#FE5E00]/40 rounded-xl py-2 text-xs text-sb-ink-muted hover:text-sb-ink transition-all"
            >
              <Truck className="w-3.5 h-3.5" /> Track
            </Link>
            <Link
              to={`/orders/${order.dbId}#chat`}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-sb-ink/12 hover:border-[#FE5E00]/40 rounded-xl py-2 text-xs text-sb-ink-muted hover:text-sb-ink transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Message StructBay
            </Link>
            <button
              type="button"
              onClick={() => openInvoices(order.dbId)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-sb-ink/12 hover:border-[#FE5E00]/40 rounded-xl py-2 text-xs text-sb-ink-muted hover:text-sb-ink transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Invoice PDF
            </button>
            {order.status === "Delivered" && (
              <Link
                to="/shop"
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange font-semibold rounded-xl py-2 text-xs transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Reorder
              </Link>
            )}
          </div>
        </div>
      ))}
      </div>
      )}
    </div>
  );
}

/* ─── Section: Invoices ─────────────────────────────────── */
function InvoicesSection({ orders }: { orders: CustomerUiOrder[] }) {
  const rows = orders.filter(o => o.status !== "Cancelled");

  const openInvoices = async (orderId: string) => {
    try {
      const res = await api.getOrderInvoices(orderId);
      const list = (res as { data?: { url?: string }[] }).data || [];
      const pdf = list.find(x => x.url);
      if (pdf?.url) window.open(pdf.url, "_blank", "noopener,noreferrer");
      else alert("No invoice PDF is available for this order yet.");
    } catch {
      alert("Could not load invoices. Ensure you are signed in with a valid customer session.");
    }
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="text-center py-16 text-sb-ink-muted/50 text-sm">No invoices yet.</div>
      ) : (
      rows.map(order => (
        <div key={order.dbId} className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-4 flex items-center justify-between hover:border-sb-ink/18 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FE5E00]/15 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#FE5E00]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-sb-ink">{order.id}</p>
              <p className="text-xs text-sb-ink-muted/60">{order.date} · {order.total}</p>
              <span className={`text-xs font-semibold ${order.statusClass}`}>{order.status}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openInvoices(order.dbId)}
            className="flex items-center gap-1.5 border border-white/12 hover:border-[#FE5E00]/50 rounded-xl px-3 py-2 text-xs text-sb-ink-muted hover:text-sb-ink transition-all"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      ))
      )}
      <p className="text-xs text-sb-ink-muted/40 text-center pt-2">StructBay and vendor tax invoices appear here when uploaded. E-way bills show after dispatch.</p>
    </div>
  );
}

/* ─── Section: Addresses ────────────────────────────────── */
function AddressesSection({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<CustomerUiAddress[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDR_STORAGE);
      if (raw) setAddresses(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ADDR_STORAGE, JSON.stringify(addresses));
    } catch { /* ignore */ }
  }, [addresses]);

  useEffect(() => {
    onCountChange?.(addresses.length);
  }, [addresses.length, onCountChange]);

  const addAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddresses(prev => [...prev, { ...form, id: Date.now().toString(), isDefault: false }]);
    setShowForm(false);
    setForm({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
  };

  const orderHere = (addr: CustomerUiAddress) => {
    sessionStorage.setItem("sb_checkout_prefill", JSON.stringify({
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    }));
    navigate("/shop");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-sb-ink-muted/50">
        Use <strong className="text-sb-ink">Order here</strong> to shop with this delivery address pre-filled at checkout (you can still edit it).
      </p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-sb-ink-muted/60">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-5">
          <h3 className="font-semibold text-sb-ink text-sm mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-[#FE5E00]" /> New Address
          </h3>
          <form onSubmit={addAddress} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">Label</label>
                <select value={form.label} onChange={e => update("label", e.target.value)} className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink focus:outline-none">
                  <option>Home</option><option>Office</option><option>Site</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">Full Name *</label>
                <input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Contact name" className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink-muted/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">Phone *</label>
                <input required value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink-muted/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">Pincode *</label>
                <input required value={form.pincode} onChange={e => update("pincode", e.target.value)} placeholder="560001" className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink-muted/30 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">Address Line 1 *</label>
              <input required value={form.line1} onChange={e => update("line1", e.target.value)} placeholder="Street, locality, landmark" className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink-muted/30 focus:outline-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">City</label>
                <input value={form.city} onChange={e => update("city", e.target.value)} className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">State</label>
                <input value={form.state} onChange={e => update("state", e.target.value)} className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange font-semibold rounded-xl py-2.5 text-sm transition-colors">Save Address</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-sb-surface text-sb-ink-muted/70 border border-sb-ink/12 hover:border-sb-ink/18 rounded-xl py-2.5 text-sm transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {addresses.map(addr => (
        <div key={addr.id} className={`bg-sb-surface-2 rounded-xl border p-4 hover:border-sb-ink/18 transition-colors ${addr.isDefault ? "border-[#FE5E00]/40" : "border-sb-ink/12"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FE5E00]/15 flex items-center justify-center shrink-0 mt-0.5">
                {addr.label === "Office" ? <Building2 className="w-4 h-4 text-[#FE5E00]" /> : <Home className="w-4 h-4 text-[#FE5E00]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold text-[#FE5E00] bg-[#FE5E00]/10 px-2 py-0.5 rounded-md">{addr.label}</span>
                  {addr.isDefault && <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">Default</span>}
                </div>
                <p className="font-semibold text-sm text-sb-ink">{addr.name}</p>
                <p className="text-xs text-sb-ink-muted/60">{addr.line1}</p>
                <p className="text-xs text-sb-ink-muted/60">{addr.city}, {addr.state} – {addr.pincode}</p>
                <p className="text-xs text-sb-ink-muted/40 mt-1">📞 {addr.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setAddresses(prev => prev.filter(a => a.id !== addr.id))}
              className="text-sb-ink-muted/30 hover:text-red-400 transition-colors shrink-0"
              type="button"
              aria-label="Remove address"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-sb-ink/10">
            <button
              type="button"
              onClick={() => orderHere(addr)}
              className="flex-1 min-w-[140px] bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange text-xs font-bold rounded-xl py-2.5 transition-colors"
            >
              Order here
            </button>
            {!addr.isDefault && (
              <button
                type="button"
                onClick={() => setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addr.id })))}
                className="text-xs text-sb-ink-muted/50 hover:text-[#FE5E00] transition-colors px-3 py-2 border border-sb-ink/12 rounded-xl"
              >
                Set as Default
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Notifications ────────────────────────────── */
function NotificationsSection({ onUnreadChange }: { onUnreadChange?: (n: number) => void }) {
  const [notifs, setNotifs] = useState<CustomerUiNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const unread = notifs.filter(n => !n.isRead).length;

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  const load = () => {
    setLoading(true);
    setErr(null);
    api.getNotifications({ limit: "50" })
      .then((res: any) => {
        const payload = res?.data;
        const raw = Array.isArray(payload) ? payload : (payload?.items ?? []);
        setNotifs(raw.map(mapApiNotif));
      })
      .catch((e: Error) => {
        setErr(e.message || "Could not load notifications");
        setNotifs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const remove = async (id: string) => {
    try {
      await api.removeNotification(id);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-sb-ink-muted/60">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="text-xs text-sb-ink-muted/50 hover:text-[#FE5E00] transition-colors px-2 py-1 rounded-lg border border-sb-ink/12">
            Refresh
          </button>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-[#FE5E00] hover:text-[#E05200] transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div className="text-center py-12 text-sm text-sb-ink-muted/50">Loading…</div>
      )}
      {err && !loading && (
        <p className="text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{err}</p>
      )}
      {!loading && notifs.length === 0 && !err && (
        <div className="text-center py-16 text-sb-ink-muted/40">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No notifications</p>
        </div>
      )}
      {!loading && notifs.map(n => (
        <div
          key={n.id}
          className={`bg-sb-surface-2 rounded-xl border p-4 transition-colors ${n.isRead ? "border-sb-ink/10" : "border-[#FE5E00]/30"}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{notifIcon[n.type] || "🔔"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${n.isRead ? "text-sb-ink-muted/80" : "text-sb-ink"}`}>{n.title}</p>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#FE5E00] shrink-0" />}
              </div>
              <p className="text-xs text-sb-ink-muted/60 mt-0.5">{n.message}</p>
              <p className="text-xs text-sb-ink-muted/30 mt-1">{n.time}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {!n.isRead && (
                <button type="button" onClick={() => markRead(n.id)} className="text-sb-ink-muted/40 hover:text-green-400 transition-colors" aria-label="Mark read">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={() => remove(n.id)} className="text-sb-ink-muted/40 hover:text-red-400 transition-colors" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Profile ──────────────────────────────────── */
function ProfileSection({ user }: { user: any }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:        user?.name        || "",
    company:     user?.company     || "",
    email:       user?.email       || "",
    phone:       "",
    gst:         "",
  });

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-6">
        <div className="flex items-center gap-4 pb-4 mb-4 border-b border-sb-ink/10">
          <div className="w-16 h-16 rounded-2xl bg-[#FE5E00] flex items-center justify-center text-sb-on-orange font-black text-2xl shrink-0">
            {(user?.name?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sb-ink">{user?.name}</p>
            <p className="text-sb-ink-muted/60 text-sm">{user?.company}</p>
            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md font-semibold">Verified Customer</span>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            {[
              ["Name", "name", "text"],
              ["Company", "company", "text"],
              ["Email", "email", "email"],
              ["Phone", "phone", "tel"],
              ["GST Number", "gst", "text"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-sb-ink-muted/70 mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-sb-surface border border-sb-ink/12 rounded-xl px-3 py-2 text-sm text-sb-ink focus:outline-none focus:border-[#FE5E00]/50"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="flex-1 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange font-semibold rounded-xl py-2.5 text-sm transition-colors">Save Changes</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-sb-surface border border-sb-ink/12 text-sb-ink-muted/70 rounded-xl py-2.5 text-sm transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {[
                ["Name",       form.name],
                ["Company",    form.company],
                ["Email",      form.email],
                ["Phone",      form.phone],
                ["GST Number", form.gst],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-sb-ink/8">
                  <span className="text-sb-ink-muted/60 text-sm">{label}</span>
                  <span className="font-medium text-sm text-sb-ink">{value || "—"}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full mt-4 py-3 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange font-bold transition-colors"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-sb-surface-2 rounded-xl border border-sb-ink/12 p-5">
        <h3 className="font-semibold text-sb-ink text-sm mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {["Order Updates", "Payment Confirmations", "Dispatch Alerts", "Delivery Updates", "Promotional Offers"].map(pref => (
            <label key={pref} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-sb-ink-muted/70">{pref}</span>
              <div className="w-10 h-5 bg-[#FE5E00] rounded-full relative cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────── */
export function Dashboard() {
  const { user, setIsLoggedIn, setUser, isLoggedIn } = useApp();
  const navigate    = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [active, setActive]           = useState(section || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<CustomerUiOrder[]>([]);
  const [savedAddrCount, setSavedAddrCount] = useState(() => {
    try {
      const raw = localStorage.getItem(ADDR_STORAGE);
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  });
  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getOrders({ limit: "100" });
        const raw = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) setOrders(raw.map(mapApiOrder));
      } catch {
        if (!cancelled) setOrders([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    api.getNotifications({ limit: "1" })
      .then((r: any) => {
        const c = r?.data?.unreadCount;
        if (typeof c === "number") setNotifUnread(c);
      })
      .catch(() => { /* ignore */ });
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-sb-ink-muted/70 mb-4">Please login to access your dashboard.</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-sb-on-orange px-6 py-3 rounded-2xl font-bold transition-colors">
          Login <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const logout = () => {
    clearCustomerSession();
    setUser(null);
    setIsLoggedIn(false);
    navigate("/");
  };

  const sidebarProps = {
    user, active, setActive,
    close: () => setSidebarOpen(false),
    logout,
  };

  const sectionTitle: Record<string, string> = {
    dashboard: "Dashboard", orders: "My Orders", invoices: "Invoices",
    addresses: "Addresses", notifications: "Notifications", profile: "Profile",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-sb-page">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-sb-ink/10">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full shadow-2xl">
            <Sidebar {...sidebarProps} />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-sb-ink-muted/60 hover:text-sb-ink">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-sb-page border-b border-sb-ink/10 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-sb-surface-2 text-sb-ink-muted transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sb-ink font-semibold capitalize">{sectionTitle[active] || active}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActive("notifications")} className="relative p-2 rounded-lg hover:bg-sb-surface-2 text-sb-ink-muted transition-colors">
              <Bell className="w-4 h-4" />
              {notifUnread > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-[#FE5E00] text-sb-on-orange rounded-full">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              )}
            </button>
            <Link to="/" className="flex items-center gap-1.5 text-sb-ink-muted hover:text-[#FE5E00] text-xs px-3 py-1.5 rounded-lg border border-sb-ink/12 hover:border-[#FE5E00]/40 transition-all">
              <ShoppingBag className="w-3 h-3" /> Store
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-sb-page">
          {active === "dashboard"     && <DashboardHome user={user} setActive={setActive} orders={orders} savedAddrCount={savedAddrCount} />}
          {active === "orders"        && <OrdersSection orders={orders} />}
          {active === "invoices"      && <InvoicesSection orders={orders} />}
          {active === "addresses"     && <AddressesSection onCountChange={setSavedAddrCount} />}
          {active === "notifications" && <NotificationsSection onUnreadChange={setNotifUnread} />}
          {active === "profile"       && <ProfileSection user={user} />}
        </div>
      </div>
    </div>
  );
}
