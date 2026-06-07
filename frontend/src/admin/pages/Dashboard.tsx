import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  DollarSign, ShoppingCart, Users, Package, Award, FolderTree,
  MapPin, AlertCircle, Clock, TrendingUp, Loader2, RefreshCw,
  Shield, Zap, Briefcase, ClipboardList,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data;
}

const revenueData = [
  { month: "Jan", revenue: 45000 }, { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 }, { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 }, { month: "Jun", revenue: 67000 },
];

const categoryData = [
  { name: "Cement", value: 35, color: "#FE5E00" },
  { name: "Steel", value: 25, color: "#C9A227" },
  { name: "Concrete", value: 20, color: "#EADCC6" },
  { name: "Bricks", value: 12, color: "#E05200" },
  { name: "Others", value: 8, color: "#D4C4A8" },
];

function StatCard({ title, value, icon: Icon, sub, subColor = "text-[#D4C4A8]/50", to }: {
  title: string; value: string | number; icon: any; sub: string; subColor?: string; to?: string;
}) {
  const content = (
    <div className="bg-[#222222] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors cursor-default h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/60">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#FE5E00]" />
        </div>
      </div>
      <div className="text-2xl font-black text-[#F4E9D8]">{value}</div>
      <p className={`text-xs mt-1.5 ${subColor}`}>{sub}</p>
    </div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-[#222222] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <h3 className="font-semibold text-[#F4E9D8] text-sm">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch("/admin/dashboard")
      .then(d => setData(d.data))
      .catch(() => {
        // Fallback demo data
        setData({
          users: { customers: 248, vendors: 38, pendingVendorApprovals: 3 },
          products: { total: 450, active: 320 },
          catalog: { brands: 24, categories: 12, cities: 5 },
          orders: { total: 180, pending: 23, pendingDispatch: 45, cancelled: 8 },
          inventory: { lowStock: 12, outOfStock: 3 },
          enquiries: { bulkEnquiries: 15, rfqs: 23 },
          cms: { activeBanners: 6, publishedBlogs: 14 },
          recentActivity: [],
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-[#FE5E00]" />
    </div>
  );

  const d = data || {};

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Admin Dashboard</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">StructBay Control Center — Master System</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-lg text-sm text-[#D4C4A8]/70 hover:border-white/20 hover:text-[#F4E9D8] transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Primary Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Orders" value={d.orders?.total ?? 0} icon={ShoppingCart} sub={`${d.orders?.pending ?? 0} pending`} subColor="text-[#FE5E00]" to="/orders" />
        <StatCard title="Total Products" value={d.products?.total ?? 0} icon={Package} sub={`${d.products?.active ?? 0} active`} to="/products" />
        <StatCard title="Total Customers" value={d.users?.customers ?? 0} icon={Users} sub="Registered customers" to="/customers" />
        <StatCard title="Total Vendors" value={d.users?.vendors ?? 0} icon={Users} sub={`${d.users?.pendingVendorApprovals ?? 0} pending approval`} subColor={d.users?.pendingVendorApprovals > 0 ? "text-[#FE5E00]" : undefined} to="/vendors" />
      </div>

      {/* Catalog Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Brands" value={d.catalog?.brands ?? 0} icon={Award} sub="Active brands" to="/brands" />
        <StatCard title="Categories" value={d.catalog?.categories ?? 0} icon={FolderTree} sub="Active categories" to="/categories" />
        <StatCard title="Cities" value={d.catalog?.cities ?? 0} icon={MapPin} sub="Serviceable cities" to="/cities" />
        <StatCard title="Pending Dispatch" value={d.orders?.pendingDispatch ?? 0} icon={Clock} sub="Need vendor assignment" subColor="text-[#C9A227]" to="/orders" />
      </div>

      {/* Alert Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard title="Low Stock" value={d.inventory?.lowStock ?? 0} icon={AlertCircle} sub="Products needing restock" subColor="text-[#FE5E00]" to="/inventory" />
        <StatCard title="Bulk Enquiries" value={d.enquiries?.bulkEnquiries ?? 0} icon={Briefcase} sub="New enquiries" subColor="text-[#FE5E00]" to="/bulk-enquiries" />
        <StatCard title="Concrete RFQs" value={d.enquiries?.rfqs ?? 0} icon={ClipboardList} sub="Pending quotations" subColor="text-[#FE5E00]" to="/rfqs" />
      </div>

      {/* Charts */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue Trend (2026)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,233,216,0.06)" />
              <XAxis dataKey="month" stroke="#D4C4A8" tick={{ fill: "#D4C4A8", fontSize: 11 }} />
              <YAxis stroke="#D4C4A8" tick={{ fill: "#D4C4A8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#222222", border: "1px solid rgba(244,233,216,0.15)", borderRadius: "8px", color: "#F4E9D8" }} />
              <Line type="monotone" dataKey="revenue" stroke="#FE5E00" strokeWidth={2.5} dot={{ fill: "#FE5E00", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top Categories">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={90} dataKey="value">
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#222222", border: "1px solid rgba(244,233,216,0.15)", borderRadius: "8px", color: "#F4E9D8" }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recent Activity"
          action={<Link to="/audit-logs" className="text-xs text-[#FE5E00] hover:underline">View all →</Link>}>
          {d.recentActivity?.length > 0 ? (
            <div className="space-y-2.5">
              {d.recentActivity.slice(0, 6).map((log: any) => (
                <div key={log._id} className="flex items-start gap-3 p-3 rounded-lg bg-[#171717] border border-white/6">
                  <div className="w-7 h-7 rounded-lg bg-[#FE5E00]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FE5E00]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#F4E9D8] truncate">{log.description}</p>
                    <p className="text-[10px] text-[#D4C4A8]/50 mt-0.5">
                      {log.module} · {log.action} · {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#D4C4A8]/40 text-sm text-center py-8">No recent activity.</p>
          )}
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Product", to: "/products/add", primary: true },
              { label: "Set Pricing", to: "/pricing" },
              { label: "Adjust Inventory", to: "/inventory" },
              { label: "Add Brand", to: "/brands" },
              { label: "Add Category", to: "/categories" },
              { label: "Add City", to: "/cities" },
              { label: "Assign Vendors", to: "/orders" },
              { label: "View RFQs", to: "/rfqs" },
            ].map(({ label, to, primary }) => (
              <Link key={label} to={to}
                className={`flex items-center justify-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${primary
                  ? "bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold"
                  : "border border-white/12 text-[#D4C4A8]/70 hover:border-[#FE5E00]/40 hover:text-[#FE5E00]"
                }`}>
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/8">
            <p className="text-xs font-semibold text-[#D4C4A8]/50 uppercase tracking-wider mb-3">System Badges</p>
            <div className="flex gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <Shield className="w-3 h-3" /> StructBay Assured
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FE5E00]/15 text-[#FE5E00] border border-[#FE5E00]/20">
                <Zap className="w-3 h-3" /> StructBay Express
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
