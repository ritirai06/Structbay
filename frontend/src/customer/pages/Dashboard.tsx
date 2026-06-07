import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  LayoutDashboard, Package, FileText, MapPin, Bell, User as UserIcon,
  ChevronRight, ArrowRight, Download, RefreshCcw, TrendingUp, Clock,
  Truck, LogOut, Menu, X, Plus, Trash2, CheckCheck, Star,
  ShoppingBag, MessageSquare, ClipboardList, Zap, Home, Building2,
} from "lucide-react";
import { useApp } from "../context/AppContext";

/* ─── Static fallback data ──────────────────────────────── */
const MOCK_ORDERS = [
  { id: "SB-24119873", date: "Dec 17, 2025", items: "Cement × 10, Steel × 2MT",    total: "₹1,45,850", status: "Out for Delivery", statusClass: "text-[#FE5E00]" },
  { id: "SB-24118654", date: "Dec 14, 2025", items: "Asian Paints Apex 20L × 5",   total: "₹21,000",   status: "Delivered",        statusClass: "text-green-400" },
  { id: "SB-24117421", date: "Dec 10, 2025", items: "Ambuja Cement × 30 bags",     total: "₹10,950",   status: "Delivered",        statusClass: "text-green-400" },
  { id: "SB-24116308", date: "Dec 5, 2025",  items: "Stanley Tool Kit × 2",        total: "₹5,600",    status: "Cancelled",        statusClass: "text-red-400" },
];

const MOCK_NOTIFICATIONS = [
  { id: "1", title: "Order Dispatched", message: "Your order SB-24119873 has been dispatched.", time: "2h ago", isRead: false, type: "DISPATCH" },
  { id: "2", title: "Payment Confirmed", message: "Payment of ₹21,000 received for SB-24118654.", time: "1d ago", isRead: false, type: "PAYMENT" },
  { id: "3", title: "Order Delivered", message: "SB-24117421 delivered successfully.", time: "3d ago", isRead: true, type: "DELIVERY" },
];

const MOCK_ADDRESSES = [
  { id: "1", label: "Site", name: "Rajesh Kumar", line1: "14/B, 2nd Cross, Yeshwanthpur", city: "Bengaluru", state: "Karnataka", pincode: "560022", phone: "9876543210", isDefault: true },
  { id: "2", label: "Office", name: "Rajesh Kumar", line1: "Krishna Constructions, MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", phone: "9876543210", isDefault: false },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",     key: "dashboard" },
  { icon: Package,         label: "My Orders",     key: "orders" },
  { icon: FileText,        label: "Invoices",      key: "invoices" },
  { icon: MapPin,          label: "Addresses",     key: "addresses" },
  { icon: Bell,            label: "Notifications", key: "notifications" },
  { icon: UserIcon,        label: "Profile",       key: "profile" },
];

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
    <div className="h-full flex flex-col bg-[#0D0D0D]">
      <div className="p-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-bold text-lg shrink-0">
            {(user?.name?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[#F4E9D8] font-semibold text-sm truncate">{user?.name || "User"}</p>
            <p className="text-[#D4C4A8]/50 text-xs truncate">{user?.company || "Customer"}</p>
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
                : "text-[#D4C4A8]/70 hover:text-[#F4E9D8] hover:bg-[#222222]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/8 space-y-1">
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:bg-[#222222] transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> Back to Store
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#D4C4A8]/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}

/* ─── Section: Dashboard Overview ───────────────────────── */
function DashboardHome({ user, setActive }: { user: any; setActive: (k: string) => void }) {
  const widgets = [
    { label: "Total Orders",   value: "48",    icon: Package,    accent: "bg-[#FE5E00]/15", iconColor: "text-[#FE5E00]" },
    { label: "Pending Orders", value: "3",     icon: Clock,      accent: "bg-[#FE5E00]/15", iconColor: "text-[#FE5E00]" },
    { label: "Total Spent",    value: "₹8.4L", icon: TrendingUp, accent: "bg-green-500/15", iconColor: "text-green-400" },
    { label: "Active RFQs",    value: "2",     icon: FileText,   accent: "bg-[#C9A227]/15", iconColor: "text-[#C9A227]" },
    { label: "Bulk Enquiries", value: "5",     icon: MessageSquare, accent: "bg-blue-500/15", iconColor: "text-blue-400" },
    { label: "Saved Addresses",value: "2",     icon: MapPin,     accent: "bg-purple-500/15", iconColor: "text-purple-400" },
  ];

  const quickActions = [
    { label: "Shop Materials",   icon: ShoppingBag,   to: "/shop",     color: "bg-[#FE5E00]" },
    { label: "Browse Categories",icon: ClipboardList, to: "/category/cement", color: "bg-[#1A3C5E]" },
    { label: "Bulk Enquiry",     icon: MessageSquare, to: "/bulk",     color: "bg-[#C9A227]" },
    { label: "Concrete RFQ",     icon: Zap,           to: "/rfq",      color: "bg-green-700" },
    { label: "My Orders",        icon: Package,       onClick: () => setActive("orders"), color: "bg-[#222222] border border-white/10" },
    { label: "Download Invoices",icon: Download,      onClick: () => setActive("invoices"), color: "bg-[#222222] border border-white/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-bold text-[#F4E9D8]">Good day, {user?.name?.split(" ")[0]}! 👋</p>
        <p className="text-[#D4C4A8]/60 text-sm mt-0.5">Here's your procurement activity at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {widgets.map(({ label, value, icon: Icon, accent, iconColor }) => (
          <div key={label} className="bg-[#222222] rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#D4C4A8]/60 font-semibold uppercase tracking-wider leading-tight">{label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
            <p className="font-black text-xl text-[#F4E9D8]">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#222222] rounded-xl border border-white/10 p-5">
        <h3 className="font-semibold text-[#F4E9D8] text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(({ label, icon: Icon, to, onClick, color }) => {
            const cls = `flex flex-col items-center gap-2 p-3 rounded-xl ${color} hover:opacity-90 transition-opacity cursor-pointer`;
            const inner = (
              <>
                <Icon className="w-5 h-5 text-white" />
                <span className="text-[10px] font-semibold text-white text-center leading-tight">{label}</span>
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
      <div className="bg-[#222222] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="font-semibold text-[#F4E9D8] text-sm">Recent Orders</h3>
          <button onClick={() => setActive("orders")} className="text-sm font-medium text-[#FE5E00] hover:text-[#E05200] flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {MOCK_ORDERS.slice(0, 3).map(order => (
            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/15 flex items-center justify-center mt-0.5 shrink-0">
                  <Package className="w-4 h-4 text-[#FE5E00]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#F4E9D8]">{order.id}</p>
                  <p className="text-xs text-[#D4C4A8]/60">{order.items}</p>
                  <p className="text-xs text-[#D4C4A8]/40">{order.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-[#F4E9D8]">{order.total}</p>
                <span className={`text-xs font-semibold ${order.statusClass}`}>{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reorder */}
      <div className="bg-[#222222] rounded-xl border border-white/10 p-5">
        <h3 className="font-semibold text-[#F4E9D8] text-sm mb-4">Quick Reorder</h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {["Ultratech Cement 50kg", "TATA Tiscon TMT Bar", "Asian Paints Apex 20L"].map(item => (
            <div key={item} className="bg-[#171717] rounded-xl p-3 min-w-[160px] border border-white/8 hover:border-[#FE5E00]/30 shrink-0">
              <p className="text-sm font-medium text-[#F4E9D8] mb-3 line-clamp-2">{item}</p>
              <Link to="/shop" className="inline-flex items-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                <RefreshCcw className="w-3 h-3" /> Reorder
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Orders ───────────────────────────────────── */
function OrdersSection() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? MOCK_ORDERS : MOCK_ORDERS.filter(o => {
    if (filter === "active") return ["Out for Delivery", "Processing"].includes(o.status);
    if (filter === "delivered") return o.status === "Delivered";
    if (filter === "cancelled") return o.status === "Cancelled";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["all","All"],["active","Active"],["delivered","Delivered"],["cancelled","Cancelled"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === v ? "bg-[#FE5E00] text-[#0D0D0D]" : "bg-[#222222] text-[#D4C4A8]/70 border border-white/10 hover:border-white/20"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.map(order => (
        <div key={order.id} className="bg-[#222222] rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-[#F4E9D8]">{order.id}</p>
              <p className="text-sm text-[#D4C4A8]/70">{order.items}</p>
              <p className="text-xs text-[#D4C4A8]/40 mt-1">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#F4E9D8]">{order.total}</p>
              <span className={`text-sm font-semibold ${order.statusClass}`}>{order.status}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t border-white/8">
            <Link
              to="/track"
              className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-[#FE5E00]/40 rounded-xl py-2 text-xs text-[#D4C4A8] hover:text-[#F4E9D8] transition-all"
            >
              <Truck className="w-3.5 h-3.5" /> Track
            </Link>
            <button className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-[#FE5E00]/40 rounded-xl py-2 text-xs text-[#D4C4A8] hover:text-[#F4E9D8] transition-all">
              <Download className="w-3.5 h-3.5" /> Invoice
            </button>
            {order.status === "Delivered" && (
              <Link
                to="/shop"
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-semibold rounded-xl py-2 text-xs transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Reorder
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Invoices ─────────────────────────────────── */
function InvoicesSection() {
  return (
    <div className="space-y-3">
      {MOCK_ORDERS.filter(o => o.status !== "Cancelled").map(order => (
        <div key={order.id} className="bg-[#222222] rounded-xl border border-white/10 p-4 flex items-center justify-between hover:border-white/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FE5E00]/15 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#FE5E00]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#F4E9D8]">{order.id}</p>
              <p className="text-xs text-[#D4C4A8]/60">{order.date} · {order.total}</p>
              <span className={`text-xs font-semibold ${order.statusClass}`}>{order.status}</span>
            </div>
          </div>
          <button className="flex items-center gap-1.5 border border-white/12 hover:border-[#FE5E00]/50 rounded-xl px-3 py-2 text-xs text-[#D4C4A8] hover:text-[#F4E9D8] transition-all">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      ))}
      <p className="text-xs text-[#D4C4A8]/40 text-center pt-2">E-Way Bills available once order is dispatched.</p>
    </div>
  );
}

/* ─── Section: Addresses ────────────────────────────────── */
function AddressesSection() {
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddresses(prev => [...prev, { ...form, id: Date.now().toString(), companyName: "", isDefault: false }]);
    setShowForm(false);
    setForm({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#D4C4A8]/60">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-[#222222] rounded-xl border border-white/10 p-5">
          <h3 className="font-semibold text-[#F4E9D8] text-sm mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-[#FE5E00]" /> New Address
          </h3>
          <form onSubmit={addAddress} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">Label</label>
                <select value={form.label} onChange={e => update("label", e.target.value)} className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] focus:outline-none">
                  <option>Home</option><option>Office</option><option>Site</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">Full Name *</label>
                <input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Contact name" className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">Phone *</label>
                <input required value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">Pincode *</label>
                <input required value={form.pincode} onChange={e => update("pincode", e.target.value)} placeholder="560001" className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">Address Line 1 *</label>
              <input required value={form.line1} onChange={e => update("line1", e.target.value)} placeholder="Street, locality, landmark" className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">City</label>
                <input value={form.city} onChange={e => update("city", e.target.value)} className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">State</label>
                <input value={form.state} onChange={e => update("state", e.target.value)} className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-semibold rounded-xl py-2.5 text-sm transition-colors">Save Address</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-[#171717] text-[#D4C4A8]/70 border border-white/10 hover:border-white/20 rounded-xl py-2.5 text-sm transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {addresses.map(addr => (
        <div key={addr.id} className={`bg-[#222222] rounded-xl border p-4 hover:border-white/20 transition-colors ${addr.isDefault ? "border-[#FE5E00]/40" : "border-white/10"}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FE5E00]/15 flex items-center justify-center shrink-0 mt-0.5">
                {addr.label === "Office" ? <Building2 className="w-4 h-4 text-[#FE5E00]" /> : <Home className="w-4 h-4 text-[#FE5E00]" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#FE5E00] bg-[#FE5E00]/10 px-2 py-0.5 rounded-md">{addr.label}</span>
                  {addr.isDefault && <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">Default</span>}
                </div>
                <p className="font-semibold text-sm text-[#F4E9D8]">{addr.name}</p>
                <p className="text-xs text-[#D4C4A8]/60">{addr.line1}</p>
                <p className="text-xs text-[#D4C4A8]/60">{addr.city}, {addr.state} – {addr.pincode}</p>
                <p className="text-xs text-[#D4C4A8]/40 mt-1">📞 {addr.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setAddresses(prev => prev.filter(a => a.id !== addr.id))}
              className="text-[#D4C4A8]/30 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {!addr.isDefault && (
            <button
              onClick={() => setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addr.id })))}
              className="mt-3 text-xs text-[#D4C4A8]/50 hover:text-[#FE5E00] transition-colors"
            >
              Set as Default
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Notifications ────────────────────────────── */
function NotificationsSection() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const unread = notifs.filter(n => !n.isRead).length;

  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  const remove = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#D4C4A8]/60">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-[#FE5E00] hover:text-[#E05200] transition-colors">
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        )}
      </div>
      {notifs.length === 0 && (
        <div className="text-center py-16 text-[#D4C4A8]/40">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No notifications</p>
        </div>
      )}
      {notifs.map(n => (
        <div
          key={n.id}
          className={`bg-[#222222] rounded-xl border p-4 transition-colors ${n.isRead ? "border-white/8" : "border-[#FE5E00]/30"}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{notifIcon[n.type] || "🔔"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${n.isRead ? "text-[#D4C4A8]/80" : "text-[#F4E9D8]"}`}>{n.title}</p>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#FE5E00] shrink-0" />}
              </div>
              <p className="text-xs text-[#D4C4A8]/60 mt-0.5">{n.message}</p>
              <p className="text-xs text-[#D4C4A8]/30 mt-1">{n.time}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {!n.isRead && (
                <button onClick={() => markRead(n.id)} className="text-[#D4C4A8]/40 hover:text-green-400 transition-colors">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => remove(n.id)} className="text-[#D4C4A8]/40 hover:text-red-400 transition-colors">
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
    phone:       "+91 98765 43210",
    gst:         "29AABCS1234B1Z5",
  });

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-[#222222] rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-4 pb-4 mb-4 border-b border-white/8">
          <div className="w-16 h-16 rounded-2xl bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-black text-2xl shrink-0">
            {(user?.name?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#F4E9D8]">{user?.name}</p>
            <p className="text-[#D4C4A8]/60 text-sm">{user?.company}</p>
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
                <label className="block text-xs font-medium text-[#D4C4A8]/70 mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F4E9D8] focus:outline-none focus:border-[#FE5E00]/50"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="flex-1 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-semibold rounded-xl py-2.5 text-sm transition-colors">Save Changes</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-[#171717] border border-white/10 text-[#D4C4A8]/70 rounded-xl py-2.5 text-sm transition-colors">Cancel</button>
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
                <div key={label} className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-[#D4C4A8]/60 text-sm">{label}</span>
                  <span className="font-medium text-sm text-[#F4E9D8]">{value || "—"}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full mt-4 py-3 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold transition-colors"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-[#222222] rounded-xl border border-white/10 p-5">
        <h3 className="font-semibold text-[#F4E9D8] text-sm mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {["Order Updates", "Payment Confirmations", "Dispatch Alerts", "Delivery Updates", "Promotional Offers"].map(pref => (
            <label key={pref} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#D4C4A8]/70">{pref}</span>
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
  const { user, setIsLoggedIn, isLoggedIn } = useApp();
  const navigate    = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [active, setActive]           = useState(section || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-[#D4C4A8]/70 mb-4">Please login to access your dashboard.</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-6 py-3 rounded-2xl font-bold transition-colors">
          Login <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const logout = () => { setIsLoggedIn(false); navigate("/"); };

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
    <div className="flex h-screen overflow-hidden bg-[#0D0D0D]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/8">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full shadow-2xl">
            <Sidebar {...sidebarProps} />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-[#D4C4A8]/60 hover:text-[#F4E9D8]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[#0D0D0D] border-b border-white/8 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-[#222222] text-[#D4C4A8] transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-[#F4E9D8] font-semibold capitalize">{sectionTitle[active] || active}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActive("notifications")} className="relative p-2 rounded-lg hover:bg-[#222222] text-[#D4C4A8] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#FE5E00] rounded-full" />
            </button>
            <Link to="/" className="flex items-center gap-1.5 text-[#D4C4A8] hover:text-[#FE5E00] text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#FE5E00]/40 transition-all">
              <ShoppingBag className="w-3 h-3" /> Store
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0D0D0D]">
          {active === "dashboard"     && <DashboardHome user={user} setActive={setActive} />}
          {active === "orders"        && <OrdersSection />}
          {active === "invoices"      && <InvoicesSection />}
          {active === "addresses"     && <AddressesSection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "profile"       && <ProfileSection user={user} />}
        </div>
      </div>
    </div>
  );
}
