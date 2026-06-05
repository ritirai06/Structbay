import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  LayoutDashboard, Package, FileText, MapPin, Bell, User as UserIcon,
  ChevronRight, ArrowRight, Download, RefreshCcw, TrendingUp, Clock,
  Truck, LogOut, Menu, X,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const ORDERS = [
  { id: "SB-24119873", date: "Dec 17, 2025", items: "Cement × 10, Steel × 2MT",      total: "₹1,45,850", status: "Out for Delivery", statusClass: "text-[#FE5E00]" },
  { id: "SB-24118654", date: "Dec 14, 2025", items: "Asian Paints Apex 20L × 5",      total: "₹21,000",   status: "Delivered",        statusClass: "text-green-400" },
  { id: "SB-24117421", date: "Dec 10, 2025", items: "Ambuja Cement × 30 bags",         total: "₹10,950",   status: "Delivered",        statusClass: "text-green-400" },
  { id: "SB-24116308", date: "Dec 5, 2025",  items: "Stanley Tool Kit × 2",            total: "₹5,600",    status: "Cancelled",        statusClass: "text-red-400" },
];

const RFQS = [
  { id: "RFQ-1234", type: "Concrete M30", qty: "50 Cubic M", date: "Dec 15, 2025", status: "Quote Received" },
  { id: "RFQ-1233", type: "Concrete M25", qty: "80 Cubic M", date: "Dec 8, 2025",  status: "Pending" },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",     key: "dashboard" },
  { icon: Package,         label: "My Orders",     key: "orders" },
  { icon: FileText,        label: "Invoices",      key: "invoices" },
  { icon: MapPin,          label: "Addresses",     key: "addresses" },
  { icon: Bell,            label: "Notifications", key: "notifications" },
  { icon: UserIcon,        label: "Profile",       key: "profile" },
];

const WIDGETS = [
  { label: "Total Orders",   value: "48",    icon: Package,    accent: "bg-[#FE5E00]/15",   iconColor: "text-[#FE5E00]" },
  { label: "Pending Orders", value: "3",     icon: Clock,      accent: "bg-[#FE5E00]/15",   iconColor: "text-[#FE5E00]" },
  { label: "Total Spent",    value: "₹8.4L", icon: TrendingUp, accent: "bg-green-500/15",   iconColor: "text-green-400" },
  { label: "Active RFQs",    value: "2",     icon: FileText,   accent: "bg-[#C9A227]/15",   iconColor: "text-[#C9A227]" },
];

function SidebarContent({
  user, activeSection, setActiveSection, setSidebarOpen, setIsLoggedIn, navigate,
}: {
  user: any; activeSection: string;
  setActiveSection: (k: string) => void;
  setSidebarOpen: (v: boolean) => void;
  setIsLoggedIn: (v: boolean) => void;
  navigate: (path: string) => void;
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
            <p className="text-[#D4C4A8]/50 text-xs truncate">{user?.company || "Company"}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, key }) => (
          <button
            key={key}
            onClick={() => { setActiveSection(key); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeSection === key
                ? "bg-[#FE5E00]/15 text-[#FE5E00] font-semibold border-l-2 border-[#FE5E00] pl-[10px]"
                : "text-[#D4C4A8]/70 hover:text-[#F4E9D8] hover:bg-[#222222]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/8">
        <button
          onClick={() => { setIsLoggedIn(false); navigate("/"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#D4C4A8]/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user, setIsLoggedIn, isLoggedIn } = useApp();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-[#D4C4A8]/70 mb-4">Please login to access your dashboard.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] px-6 py-3 rounded-2xl font-bold transition-colors"
        >
          Login <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const sidebarProps = { user, activeSection, setActiveSection, setSidebarOpen, setIsLoggedIn, navigate };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D0D0D]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/8">
        <SidebarContent {...sidebarProps} />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full shadow-2xl">
            <SidebarContent {...sidebarProps} />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-[#D4C4A8]/60 hover:text-[#F4E9D8]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-[#0D0D0D] border-b border-white/8 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#222222] text-[#D4C4A8] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-[#F4E9D8] font-semibold capitalize">{activeSection}</h2>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[#D4C4A8] hover:text-[#FE5E00] text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#FE5E00]/40 transition-all"
          >
            <ArrowRight className="w-3 h-3 rotate-180" /> Back to Store
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0D0D0D]">

          {/* ── Dashboard ── */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-bold text-[#F4E9D8]">
                  Good morning, {user?.name?.split(" ")[0]}! 👋
                </p>
                <p className="text-[#D4C4A8]/60 text-sm mt-0.5">
                  Here's an overview of your procurement activity.
                </p>
              </div>

              {/* Widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {WIDGETS.map(({ label, value, icon: Icon, accent, iconColor }) => (
                  <div key={label} className="bg-[#222222] rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[#D4C4A8]/60 font-semibold uppercase tracking-wide">{label}</span>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                    </div>
                    <p className="font-black text-xl text-[#F4E9D8]">{value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-[#222222] rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                  <h3 className="font-semibold text-[#F4E9D8] text-sm">Recent Orders</h3>
                  <button
                    onClick={() => setActiveSection("orders")}
                    className="text-sm font-medium text-[#FE5E00] hover:text-[#E05200] flex items-center gap-1 transition-colors"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {ORDERS.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
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
                    <div key={item} className="bg-[#171717] rounded-xl p-3 min-w-[160px] border border-white/8 hover:border-[#FE5E00]/30 transition-colors">
                      <p className="text-sm font-medium text-[#F4E9D8] mb-3 line-clamp-2">{item}</p>
                      <button className="flex items-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                        <RefreshCcw className="w-3 h-3" /> Reorder
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Orders ── */}
          {activeSection === "orders" && (
            <div className="space-y-4">
              {ORDERS.map(order => (
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
                      className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-[#FE5E00]/40 rounded-xl py-2 text-sm text-[#D4C4A8] hover:text-[#F4E9D8] transition-all"
                    >
                      <Truck className="w-3.5 h-3.5" /> Track
                    </Link>
                    <button className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-[#FE5E00]/40 rounded-xl py-2 text-sm text-[#D4C4A8] hover:text-[#F4E9D8] transition-all">
                      <Download className="w-3.5 h-3.5" /> Invoice
                    </button>
                    {order.status === "Delivered" && (
                      <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-semibold rounded-xl py-2 text-sm transition-colors">
                        <RefreshCcw className="w-3.5 h-3.5" /> Reorder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Invoices ── */}
          {activeSection === "invoices" && (
            <div className="space-y-3">
              {ORDERS.filter(o => o.status !== "Cancelled").map(order => (
                <div key={order.id} className="bg-[#222222] rounded-xl border border-white/10 p-4 flex items-center justify-between hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FE5E00]/15 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#FE5E00]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#F4E9D8]">{order.id}</p>
                      <p className="text-xs text-[#D4C4A8]/60">{order.date} · {order.total}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 border border-white/12 hover:border-[#FE5E00]/50 rounded-xl px-3 py-2 text-sm text-[#D4C4A8] hover:text-[#F4E9D8] transition-all">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Profile ── */}
          {activeSection === "profile" && (
            <div className="max-w-lg">
              <div className="bg-[#222222] rounded-xl border border-white/10 p-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-white/8">
                  <div className="w-16 h-16 rounded-2xl bg-[#FE5E00] flex items-center justify-center text-[#0D0D0D] font-black text-2xl shrink-0">
                    {(user?.name?.[0] || "U").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#F4E9D8]">{user?.name}</p>
                    <p className="text-[#D4C4A8]/60 text-sm">{user?.company}</p>
                  </div>
                </div>
                {[
                  ["Name",    user?.name],
                  ["Company", user?.company],
                  ["Email",   user?.email],
                  ["Phone",   "+91 98765 43210"],
                  ["GST",     "29AABCS1234B1Z5"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[#D4C4A8]/60 text-sm">{label}</span>
                    <span className="font-medium text-sm text-[#F4E9D8]">{value}</span>
                  </div>
                ))}
                <button className="w-full py-3 rounded-xl bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold transition-colors mt-2">
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {(activeSection === "addresses" || activeSection === "notifications") && (
            <div className="text-center py-16 text-[#D4C4A8]/40">
              <p>This section is coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
