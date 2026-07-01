import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Package, FileText, MapPin, Bell, User as UserIcon,
  ChevronRight, ArrowRight, Download, RefreshCcw, TrendingUp, Clock,
  Truck, LogOut, Menu, X, Plus, Trash2, CheckCheck, Star,
  ShoppingBag, MessageSquare, ClipboardList, Zap, Home, Building2, MessageCircle,
  CreditCard, PackageCheck, ClipboardPen, Megaphone, Phone, XCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { useBulkEnquiryModal } from "../context/BulkEnquiryModalContext";
import { openOrderInvoices } from "../lib/orderInvoices";
import { canCustomerCancelOrder } from "../lib/orderEligibility";
import { clearCustomerSession } from "../lib/authStorage";
import logoImg from "/shared/assets/logos/Structbay-Logo-F-1.png";

const ADDR_STORAGE = "sb_customer_addresses_v1";

type CustomerUiOrder = {
  id: string;
  dbId: string;
  date: string;
  items: string;
  total: string;
  grandTotal: number;
  status: string;
  apiStatus: string;
  statusClass: string;
  project: { _id: string; name: string; } | null;
};

type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  totalSpent: number;
  rfqs: number;
  bulkEnquiries: number;
  savedAddresses: number;
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
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { icon: Package, label: "My Orders", key: "orders" },
  { icon: Building2, label: "My Projects", key: "projects", path: "/projects" },
  { icon: MapPin, label: "Addresses", key: "addresses" },
  { icon: Bell, label: "Notifications", key: "notifications" },
  { icon: UserIcon, label: "Profile", key: "profile" },
];

function mapApiStatus(status: string): { label: string; cls: string } {
  if (["DELIVERED", "COMPLETED"].includes(status)) return { label: "Delivered", cls: "text-[#E85A00]" };
  if (status === "CANCELLED") return { label: "Cancelled", cls: "text-red-400" };
  if (status === "OUT_FOR_DELIVERY") return { label: "Out for Delivery", cls: "text-[#E85A00]" };
  if (["READY_FOR_DISPATCH", "PROCESSING", "VENDOR_ASSIGNMENT_PENDING", "DISPATCHED"].includes(status)) {
    return { label: "Processing", cls: "text-blue-500" };
  }
  return { label: (status || "—").replace(/_/g, " "), cls: "text-gray-500/70" };
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
    grandTotal: Number(o.grandTotal || 0),
    status: st.label,
    apiStatus: o.status || "",
    statusClass: st.cls,
    project: o.project ? { _id: o.project._id, name: o.project.name } : null,
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

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  ORDER: ShoppingBag,
  PAYMENT: CreditCard,
  DISPATCH: Truck,
  DELIVERY: PackageCheck,
  INVOICE: FileText,
  ENQUIRY: ClipboardList,
  RFQ: ClipboardPen,
  ANNOUNCEMENT: Megaphone,
};

/* ─── Sidebar ───────────────────────────────────────────── */
function Sidebar({ user, active, setActive, close, logout }: {
  user: any; active: string;
  setActive: (k: string) => void;
  close: () => void;
  logout: () => void;
}) {
  return (
    <div className="sf-dash-sidebar h-full flex flex-col border-r">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E85A00] flex items-center justify-center text-white font-bold text-lg shrink-0">
            {(user?.name?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-black font-semibold text-sm truncate">{user?.name || "User"}</p>
            <p className="text-gray-500/50 text-xs truncate">{user?.company || "Customer"}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, key, path }) => {
          const cls = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${active === key
              ? "bg-[#E85A00]/12 text-[#E85A00] font-semibold border-l-2 border-[#E85A00] pl-[10px]"
              : "text-gray-600 hover:text-black hover:bg-gray-50"
            }`;
          return path ? (
            <Link key={key} to={path} className={cls}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ) : (
            <button
              key={key}
              onClick={() => { setActive(key); close(); }}
              className={cls}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-200 space-y-1">
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-black hover:bg-gray-50 transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> Back to Store
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}

/* ─── Section: Dashboard Overview ───────────────────────── */
function DashboardHome({ user, setActive, orders, stats, savedAddrCount }: {
  user: any;
  setActive: (k: string) => void;
  orders: CustomerUiOrder[];
  stats: DashboardStats | null;
  savedAddrCount: number;
}) {
  const totalOrders = stats?.totalOrders ?? orders.length;
  const pendingOrders = stats?.pendingOrders ?? orders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
  const totalSpent = stats?.totalSpent ?? orders
    .filter(o => o.apiStatus !== "CANCELLED")
    .reduce((sum, o) => sum + o.grandTotal, 0);
  const rfqs = stats?.rfqs ?? 0;
  const bulkEnquiries = stats?.bulkEnquiries ?? 0;
  const addressCount = stats?.savedAddresses ?? savedAddrCount;
  const { openBulkEnquiry } = useBulkEnquiryModal();

  const widgets = [
    { label: "Total Orders", value: String(totalOrders), icon: Package, accent: "bg-[#E85A00]/12", iconColor: "text-[#E85A00]" },
    { label: "Pending Orders", value: String(pendingOrders), icon: Clock, accent: "bg-[#E85A00]/12", iconColor: "text-[#E85A00]" },
    { label: "Total Spent", value: `₹${totalSpent.toLocaleString("en-IN")}`, icon: TrendingUp, accent: "bg-[#E85A00]/12", iconColor: "text-[#E85A00]" },
    { label: "Active RFQs", value: String(rfqs), icon: FileText, accent: "bg-[#E85A00]/12", iconColor: "text-[#E85A00]" },
    { label: "Bulk Enquiries", value: String(bulkEnquiries), icon: MessageSquare, accent: "bg-[#E85A00]/12", iconColor: "text-[#E85A00]" },
    { label: "Saved Addresses", value: String(addressCount), icon: MapPin, accent: "bg-black/5", iconColor: "text-black" },
  ];

  const quickActions = [
    { label: "Shop Materials", icon: ShoppingBag, to: "/shop", color: "bg-[#E85A00]", solid: true },
    { label: "Browse Categories", icon: ClipboardList, to: "/shop", color: "bg-[#E85A00]", solid: true },
    { label: "Bulk Enquiry", icon: MessageSquare, onClick: openBulkEnquiry, color: "bg-black", solid: true },
    { label: "Concrete RFQ", icon: Zap, to: "/rfq", color: "bg-[#CC4E00]", solid: true },
    { label: "My Orders", icon: Package, onClick: () => setActive("orders"), color: "bg-white border-2 border-[#E85A00]", solid: false },
    { label: "My Projects", icon: Building2, to: "/projects", color: "bg-white border-2 border-[#E85A00]", solid: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-semibold text-black">Good day, {user?.name?.split(" ")[0]}!</p>
        <p className="text-gray-500 text-sm mt-0.5">Here's your procurement activity at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {widgets.map(({ label, value, icon: Icon, accent, iconColor }) => (
          <div key={label} className="sf-dash-card rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider leading-tight">{label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
            <p className="font-black text-xl text-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="sf-dash-card rounded-xl p-5">
        <h3 className="font-semibold text-black text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(({ label, icon: Icon, to, onClick, color, solid }) => {
            const cls = `flex flex-col items-center gap-2 p-3 rounded-xl ${color} hover:opacity-90 transition-opacity cursor-pointer`;
            const inner = (
              <>
                <Icon className={`w-5 h-5 ${solid ? "text-white" : "text-[#E85A00]"}`} />
                <span className={`text-[10px] font-semibold text-center leading-tight ${solid ? "text-white" : "text-black"}`}>{label}</span>
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
      <div className="sf-dash-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-black text-sm">Recent Orders</h3>
          <button onClick={() => setActive("orders")} className="text-sm font-medium text-[#E85A00] hover:text-[#CC4E00] flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No orders yet. Browse the store and place your first order.</div>
          ) : (
            orders.slice(0, 3).map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E85A00]/15 flex items-center justify-center mt-0.5 shrink-0">
                    <Package className="w-4 h-4 text-[#E85A00]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-black">{order.id}</p>
                    <p className="text-xs text-gray-500">{order.items}</p>
                    <p className="text-xs text-gray-400">{order.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-black">{order.total}</p>
                  <span className={`text-xs font-semibold ${order.statusClass}`}>{order.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Reorder */}
      <div className="sf-dash-card rounded-xl p-5">
        <h3 className="font-semibold text-black text-sm mb-4">Quick Reorder</h3>
        <p className="text-sm text-gray-500">Your frequently ordered items will appear here once you have order history.</p>
        <Link to="/shop" className="inline-flex mt-4 items-center gap-2 text-[#E85A00] text-sm font-medium hover:underline">
          Browse shop <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Section: Orders ───────────────────────────────────── */
function OrdersSection({ orders, onReload }: { orders: CustomerUiOrder[]; onReload: () => void }) {
  const [filter, setFilter] = useState("all");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ _id: string, name: string }[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects().then((res: any) => {
      setProjects(res.data || []);
    }).catch(() => { });
  }, []);

  const handleAssignProject = async (orderId: string, projectId: string) => {
    setAssigningId(orderId);
    try {
      await api.assignOrderToProject({ orderId, projectId: projectId || null });
      onReload();
    } catch (e: any) {
      alert(e.message || "Failed to assign project");
    } finally {
      setAssigningId(null);
    }
  };

  const filtered = filter === "all" ? orders : orders.filter(o => {
    if (filter === "active") return !["Delivered", "Cancelled"].includes(o.status);
    if (filter === "delivered") return o.status === "Delivered";
    if (filter === "cancelled") return o.status === "Cancelled";
    return true;
  });

  const openInvoices = async (order: CustomerUiOrder) => {
    try {
      await openOrderInvoices(order.dbId, order.id);
    } catch {
      alert("Could not load invoices. Ensure you are signed in with a valid customer session.");
    }
  };

  const cancelOrder = async (order: CustomerUiOrder) => {
    if (!window.confirm(`Cancel order ${order.id}?`)) return;
    const reason = window.prompt("Reason (optional)") || undefined;
    setCancelId(order.dbId);
    try {
      await api.cancelOrder(order.dbId, reason);
      onReload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not cancel order");
    } finally {
      setCancelId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["all", "All"], ["active", "Active"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filter === v ? "bg-[#E85A00] text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
              }`}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500/50 text-sm">No orders to show.</div>
      ) : (
        <div className="max-h-[min(72vh,800px)] overflow-y-auto space-y-4 pr-1 -mr-1">
          {filtered.map(order => (
            <div key={order.dbId} className="sf-dash-card rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-black">{order.id}</p>
                  <p className="text-sm text-gray-500/70">{order.items}</p>
                  <p className="text-xs text-gray-500/40 mt-1">{order.date}</p>
                  {projects.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Project:</span>
                      <select
                        value={order.project?._id || ""}
                        onChange={e => handleAssignProject(order.dbId, e.target.value)}
                        disabled={assigningId === order.dbId}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#E85A00]"
                      >
                        <option value="">Unassigned</option>
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                      {assigningId === order.dbId && <span className="text-xs text-gray-400">Saving...</span>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-black">{order.total}</p>
                  <span className={`text-sm font-semibold ${order.statusClass}`}>{order.status}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                <Link
                  to={`/orders/${order.dbId}`}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#E85A00]/40 rounded-xl py-2 text-xs text-gray-500 hover:text-black transition-all"
                >
                  <Truck className="w-3.5 h-3.5" /> Track
                </Link>
                <Link
                  to={`/orders/${order.dbId}#chat`}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#E85A00]/40 rounded-xl py-2 text-xs text-gray-500 hover:text-black transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Message StructBay
                </Link>
                <button
                  type="button"
                  onClick={() => openInvoices(order)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#E85A00]/40 rounded-xl py-2 text-xs text-gray-500 hover:text-black transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Invoice PDF
                </button>
                {!canCustomerCancelOrder(order.apiStatus) ? null : (
                  <button
                    type="button"
                    disabled={cancelId === order.dbId}
                    onClick={() => void cancelOrder(order)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2 text-xs font-semibold transition-all disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" /> {cancelId === order.dbId ? "Cancelling…" : "Cancel"}
                  </button>
                )}
                {order.status === "Delivered" && (
                  <Link
                    to="/shop"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#E85A00] hover:bg-[#CC4E00] text-white font-semibold rounded-xl py-2 text-xs transition-colors"
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



/* ─── Section: Addresses ────────────────────────────────── */
function mapApiAddress(a: Record<string, unknown>): CustomerUiAddress {
  return {
    id: String(a._id),
    label: String(a.label || "Home"),
    name: String(a.name || ""),
    line1: String(a.line1 || ""),
    city: String(a.city || ""),
    state: String(a.state || ""),
    pincode: String(a.pincode || ""),
    phone: String(a.phone || ""),
    isDefault: Boolean(a.isDefault),
  };
}

function AddressesSection({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const navigate = useNavigate();
  const { cart } = useApp();
  const [addresses, setAddresses] = useState<CustomerUiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const loadAddresses = () => {
    setLoading(true);
    api.getAddresses()
      .then((res: { data?: Record<string, unknown>[] }) => {
        const list = Array.isArray(res.data) ? res.data.map(mapApiAddress) : [];
        setAddresses(list);
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(ADDR_STORAGE);
          if (raw) setAddresses(JSON.parse(raw));
        } catch { /* ignore */ }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    onCountChange?.(addresses.length);
  }, [addresses.length, onCountChange]);

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createAddress({
        label: form.label,
        name: form.name,
        phone: form.phone,
        line1: form.line1,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        isDefault: addresses.length === 0,
      });
      const created = mapApiAddress((res as { data: Record<string, unknown> }).data);
      setAddresses(prev => [...prev, created]);
      setShowForm(false);
      setForm({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
    } catch {
      setAddresses(prev => [...prev, { ...form, id: Date.now().toString(), isDefault: prev.length === 0 }]);
      setShowForm(false);
      setForm({ label: "Home", name: "", phone: "", line1: "", city: "Bengaluru", state: "Karnataka", pincode: "" });
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (id: string) => {
    try {
      await api.deleteAddress(id);
    } catch { /* ignore */ }
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const orderHere = (addr: CustomerUiAddress) => {
    sessionStorage.setItem("sb_checkout_prefill", JSON.stringify({
      addressId: addr.id,
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    }));
    if (cart.length > 0) {
      navigate("/checkout");
    } else {
      navigate("/shop");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500/50">
        Use <strong className="text-black">Order here</strong> to shop with this delivery address auto-filled at checkout (editable). If your cart already has items, you go straight to checkout.
      </p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500/60">
          {loading ? "Loading…" : `${addresses.length} saved address${addresses.length !== 1 ? "es" : ""}`}
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-[#E85A00] hover:bg-[#CC4E00] text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="sf-dash-card rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-black text-sm mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-[#E85A00]" /> New Address
          </h3>
          <form onSubmit={addAddress} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500/70 mb-1">Label</label>
                <select value={form.label} onChange={e => update("label", e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black focus:outline-none">
                  <option>Home</option><option>Office</option><option>Site</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500/70 mb-1">Full Name *</label>
                <input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Contact name" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-500/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500/70 mb-1">Phone *</label>
                <input required value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-500/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500/70 mb-1">Pincode *</label>
                <input required value={form.pincode} onChange={e => update("pincode", e.target.value)} placeholder="560001" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-500/30 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500/70 mb-1">Address Line 1 *</label>
              <input required value={form.line1} onChange={e => update("line1", e.target.value)} placeholder="Street, locality, landmark" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black placeholder:text-gray-500/30 focus:outline-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500/70 mb-1">City</label>
                <input value={form.city} onChange={e => update("city", e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500/70 mb-1">State</label>
                <input value={form.state} onChange={e => update("state", e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="flex-1 bg-[#E85A00] hover:bg-[#CC4E00] text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-60">
                {saving ? "Saving…" : "Save Address"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white text-gray-500/70 border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 text-sm transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {addresses.map(addr => (
        <div key={addr.id} className={`sf-dash-card rounded-xl border p-4 hover:border-gray-300 transition-colors ${addr.isDefault ? "border-[#E85A00]/40" : "border-gray-200"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#E85A00]/15 flex items-center justify-center shrink-0 mt-0.5">
                {addr.label === "Office" ? <Building2 className="w-4 h-4 text-[#E85A00]" /> : <Home className="w-4 h-4 text-[#E85A00]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold text-[#E85A00] bg-[#E85A00]/10 px-2 py-0.5 rounded-md">{addr.label}</span>
                  {addr.isDefault && <span className="text-xs font-semibold text-[#E85A00] bg-[#E85A00]/10 px-2 py-0.5 rounded-md">Default</span>}
                </div>
                <p className="font-semibold text-sm text-black">{addr.name}</p>
                <p className="text-xs text-gray-500/60">{addr.line1}</p>
                <p className="text-xs text-gray-500/60">{addr.city}, {addr.state} – {addr.pincode}</p>
                <p className="text-xs text-gray-500/40 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
                  {addr.phone}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeAddress(addr.id)}
              className="text-gray-500/30 hover:text-red-400 transition-colors shrink-0"
              type="button"
              aria-label="Remove address"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => orderHere(addr)}
              className="flex-1 min-w-[140px] bg-[#E85A00] hover:bg-[#CC4E00] text-white text-xs font-bold rounded-xl py-2.5 transition-colors"
            >
              Order here
            </button>
            {!addr.isDefault && (
              <button
                type="button"
                onClick={() => {
                  api.setDefaultAddress(addr.id).catch(() => { });
                  setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addr.id })));
                }}
                className="text-xs text-gray-500/50 hover:text-[#E85A00] transition-colors px-3 py-2 border border-gray-200 rounded-xl"
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
        <p className="text-sm text-gray-500/60">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="text-xs text-gray-500/50 hover:text-[#E85A00] transition-colors px-2 py-1 rounded-lg border border-gray-200">
            Refresh
          </button>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-[#E85A00] hover:text-[#CC4E00] transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div className="text-center py-12 text-sm text-gray-500/50">Loading…</div>
      )}
      {err && !loading && (
        <p className="text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{err}</p>
      )}
      {!loading && notifs.length === 0 && !err && (
        <div className="text-center py-16 text-gray-500/40">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No notifications</p>
        </div>
      )}
      {!loading && notifs.map(n => {
        const NotifIcon = NOTIFICATION_ICONS[n.type] || Bell;
        return (
          <div
            key={n.id}
            className={`sf-dash-card rounded-xl border p-4 transition-colors ${n.isRead ? "border-gray-100" : "border-[#E85A00]/30"}`}
          >
            <div className="flex items-start gap-3">
              <NotifIcon className="w-5 h-5 shrink-0 text-gray-500/55" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.isRead ? "text-gray-500/80" : "text-black"}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#E85A00] shrink-0" />}
                </div>
                <p className="text-xs text-gray-500/60 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-500/30 mt-1">{n.time}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!n.isRead && (
                  <button type="button" onClick={() => markRead(n.id)} className="text-gray-400 hover:text-[#E85A00] transition-colors" aria-label="Mark read">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button type="button" onClick={() => remove(n.id)} className="text-gray-500/40 hover:text-red-400 transition-colors" aria-label="Dismiss">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Section: Profile ──────────────────────────────────── */
function ProfileSection({ user }: { user: any }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    company: user?.company || "",
    email: user?.email || "",
    phone: "",
    gst: "",
  });

  return (
    <div className="max-w-lg space-y-4">
      <div className="sf-dash-card rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 pb-4 mb-4 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-[#E85A00] flex items-center justify-center text-white font-black text-2xl shrink-0">
            {(user?.name?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-black">{user?.name}</p>
            <p className="text-gray-500/60 text-sm">{user?.company}</p>
            <span className="text-xs text-[#E85A00] bg-[#E85A00]/10 px-2 py-0.5 rounded-md font-semibold">Verified Customer</span>
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
                <label className="block text-xs font-medium text-gray-500/70 mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-[#E85A00]/50"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="flex-1 bg-[#E85A00] hover:bg-[#CC4E00] text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">Save Changes</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-white border border-gray-200 text-gray-500/70 rounded-xl py-2.5 text-sm transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {[
                ["Name", form.name],
                ["Company", form.company],
                ["Email", form.email],
                ["Phone", form.phone],
                ["GST Number", form.gst],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500/60 text-sm">{label}</span>
                  <span className="font-medium text-sm text-black">{value || "—"}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full mt-4 py-3 rounded-xl bg-[#E85A00] hover:bg-[#CC4E00] text-white font-bold transition-colors"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Preferences */}
      <div className="sf-dash-card rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-black text-sm mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {["Order Updates", "Payment Confirmations", "Dispatch Alerts", "Delivery Updates", "Promotional Offers"].map(pref => (
            <label key={pref} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-500/70">{pref}</span>
              <div className="w-10 h-5 bg-[#E85A00] rounded-full relative cursor-pointer">
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
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [active, setActive] = useState(section || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<CustomerUiOrder[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [savedAddrCount, setSavedAddrCount] = useState(() => {
    try {
      const raw = localStorage.getItem(ADDR_STORAGE);
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  });
  const [notifUnread, setNotifUnread] = useState(0);

  const loadOrders = () => {
    if (!isLoggedIn) return;
    api.getOrders({ limit: "100" })
      .then((res) => {
        const raw = Array.isArray(res?.data) ? res.data : [];
        setOrders(raw.map(mapApiOrder));
      })
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  const loadDashboardStats = () => {
    if (!isLoggedIn) return;
    api.getDashboard()
      .then((res) => {
        const s = res?.data?.stats;
        if (!s || typeof s !== "object") return;
        setDashboardStats({
          totalOrders: Number(s.totalOrders) || 0,
          pendingOrders: Number(s.pendingOrders) || 0,
          totalSpent: Number(s.totalSpent) || 0,
          rfqs: Number(s.rfqs) || 0,
          bulkEnquiries: Number(s.bulkEnquiries) || 0,
          savedAddresses: Number(s.savedAddresses) || 0,
        });
        if (typeof s.unreadNotifications === "number") {
          setNotifUnread(s.unreadNotifications);
        }
      })
      .catch(() => { /* keep order-based fallbacks */ });
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    loadOrders();
    loadDashboardStats();
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
        <p className="text-gray-500/70 mb-4">Please login to access your dashboard.</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-[#E85A00] hover:bg-[#CC4E00] text-white px-6 py-3 rounded-2xl font-bold transition-colors">
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
    dashboard: "Dashboard", orders: "My Orders", projects: "My Projects",
    addresses: "Addresses", notifications: "Notifications", profile: "Profile",
  };

  return (
    <div className="sf-dashboard flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-gray-200">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full shadow-2xl">
            <Sidebar {...sidebarProps} />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-500/60 hover:text-black">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-black font-semibold capitalize">{sectionTitle[active] || active}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActive("notifications")} className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <Bell className="w-4 h-4" />
              {notifUnread > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-[#E85A00] text-white rounded-full">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              )}
            </button>
            <Link to="/" className="flex items-center gap-1.5 text-gray-600 hover:text-[#E85A00] text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#E85A00]/40 transition-all">
              <ShoppingBag className="w-3 h-3" /> Store
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {active === "dashboard" && <DashboardHome user={user} setActive={setActive} orders={orders} stats={dashboardStats} savedAddrCount={savedAddrCount} />}
          {active === "orders" && <OrdersSection orders={orders} onReload={loadOrders} />}
          {active === "addresses" && <AddressesSection onCountChange={setSavedAddrCount} />}
          {active === "notifications" && <NotificationsSection onUnreadChange={setNotifUnread} />}
          {active === "profile" && <ProfileSection user={user} />}
        </div>
      </div>
    </div>
  );
}
