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
import { adminPath } from "../../lib/portalRoutes";
import { adminFetch as apiFetch } from "../../lib/adminApi";

/** Brand-only chart fills */
const CHART_COLORS = ["#E85A00", "#111111", "#E5E5E5", "#CC4E00", "#F5F5F5", "#E85A00", "#666666", "#FFFFFF"];
const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StatCard({ title, value, icon: Icon, sub, subColor = "text-sb-ink/50", to }: {
  title: string; value: string | number; icon: any; sub: string; subColor?: string; to?: string;
}) {
  const content = (
    <div className="h-full cursor-default rounded-card border border-sb-border bg-sb-card p-5 transition-all hover:border-sb-orange/40 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-sb-text-secondary">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-sb-orange-subtle flex items-center justify-center">
          <Icon className="h-4 w-4 text-sb-orange" />
        </div>
      </div>
      <div className="sb-stat-value">{value}</div>
      <p className={`text-xs mt-1.5 ${subColor}`}>{sub}</p>
    </div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-sb-border bg-sb-card">
      <div className="flex items-center justify-between border-b border-sb-border px-5 py-4">
        <h3 className="font-medium text-sb-ink text-sm">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<{ month: string; revenue: number }[]>([]);
  const [categorySeries, setCategorySeries] = useState<{ name: string; value: number; color: string }[]>([]);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      apiFetch("/admin/dashboard"),
      apiFetch("/analytics/sales/trend?period=monthly").catch(() => ({ data: [] as unknown[] })),
      apiFetch("/analytics/categories?limit=8").catch(() => ({ data: [] as unknown[] })),
    ])
      .then(([dash, trendRes, catRes]) => {
        setData(dash.data);
        const trendRows = (trendRes as { data?: unknown[] }).data || [];
        if (Array.isArray(trendRows) && trendRows.length > 0) {
          setRevenueSeries(
            trendRows.map((r: any) => {
              const m = r._id?.month;
              const y = r._id?.year;
              const label = m && y ? `${MONTH_NAMES[Number(m)] || m} ${y}` : "—";
              return { month: label, revenue: Math.round(r.revenue || 0) };
            })
          );
        } else {
          setRevenueSeries([]);
        }
        const catRows = (catRes as { data?: unknown[] }).data || [];
        if (Array.isArray(catRows) && catRows.length > 0) {
          const total = catRows.reduce((s: number, r: any) => s + (Number(r.revenue) || 0), 0) || 1;
          setCategorySeries(
            catRows.map((r: any, i: number) => ({
              name: r.category?.name || "Uncategorized",
              value: Math.max(1, Math.round(((Number(r.revenue) || 0) / total) * 100)),
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))
          );
        } else {
          setCategorySeries([]);
        }
      })
      .catch((e: Error) => {
        setData(null);
        setRevenueSeries([]);
        setCategorySeries([]);
        setLoadError(e.message || "Could not load dashboard");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-sb-orange" />
    </div>
  );

  const d = data || {};

  return (
    <div className="p-6 min-h-full">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="admin-page-title text-sb-ink">Admin Dashboard</h1>
          <p className="text-sb-ink/55 text-sm mt-1">Structbay Control Center — Master System</p>
          {loadError && <p className="mt-2 text-xs text-sb-ink/70">{loadError}</p>}
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-sb-ink/10 rounded-lg text-sm text-sb-ink/65 hover:border-sb-ink/20 hover:text-sb-ink transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Primary Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Orders" value={d.orders?.total ?? 0} icon={ShoppingCart} sub={`${d.orders?.pending ?? 0} pending`} subColor="text-sb-orange" to={adminPath("orders")} />
        <StatCard title="Total Products" value={d.products?.total ?? 0} icon={Package} sub={`${d.products?.active ?? 0} active`} to={adminPath("products")} />
        <StatCard title="Total Customers" value={d.users?.customers ?? 0} icon={Users} sub="Registered customers" to={adminPath("customers")} />
        <StatCard title="Total Vendors" value={d.users?.vendors ?? 0} icon={Users} sub={`${d.users?.pendingVendorApprovals ?? 0} pending approval`} subColor={d.users?.pendingVendorApprovals > 0 ? "text-sb-orange" : undefined} to={adminPath("vendors")} />
      </div>

      {/* Catalog Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Brands" value={d.catalog?.brands ?? 0} icon={Award} sub="Active brands" to={adminPath("brands")} />
        <StatCard title="Categories" value={d.catalog?.categories ?? 0} icon={FolderTree} sub="Active categories" to={adminPath("categories")} />
        <StatCard title="Cities" value={d.catalog?.cities ?? 0} icon={MapPin} sub="Serviceable cities" to={adminPath("cities")} />
        <StatCard title="Pending Dispatch" value={d.orders?.pendingDispatch ?? 0} icon={Clock} sub="Need vendor assignment" subColor="text-sb-orange" to={adminPath("orders")} />
      </div>

      {/* Alert Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard title="Low Stock" value={d.inventory?.lowStock ?? 0} icon={AlertCircle} sub="Products needing restock" subColor="text-sb-orange" to={adminPath("inventory")} />
        <StatCard title="Bulk Enquiries" value={d.enquiries?.bulkEnquiries ?? 0} icon={Briefcase} sub="New enquiries" subColor="text-sb-orange" to={adminPath("bulk-enquiries")} />
        <StatCard title="Concrete RFQs" value={d.enquiries?.rfqs ?? 0} icon={ClipboardList} sub="Pending quotations" subColor="text-sb-orange" to={adminPath("rfqs")} />
      </div>

      {/* Charts */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue trend (paid orders, monthly)">
          {revenueSeries.length === 0 ? (
            <p className="text-sb-ink/45 text-sm text-center py-16">No paid order revenue in range yet.</p>
          ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,34,34,0.08)" />
              <XAxis dataKey="month" stroke="rgba(34,34,34,0.35)" tick={{ fill: "rgba(34,34,34,0.55)", fontSize: 11 }} />
              <YAxis stroke="rgba(34,34,34,0.35)" tick={{ fill: "rgba(34,34,34,0.55)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E5E5",
                  borderRadius: "8px",
                  color: "#111111",
                  fontSize: "13px",
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#E85A00" strokeWidth={2.5} dot={{ fill: "#E85A00", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Sales by category (% of top categories)">
          {categorySeries.length === 0 ? (
            <p className="text-sb-ink/45 text-sm text-center py-16">No category sales in range yet.</p>
          ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categorySeries} cx="50%" cy="50%" labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={90} dataKey="value">
                {categorySeries.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E5E5",
                  borderRadius: "8px",
                  color: "#111111",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recent Activity"
          action={<Link to={adminPath("audit-logs")} className="text-xs text-sb-orange hover:underline">View all →</Link>}>
          {d.recentActivity?.length > 0 ? (
            <div className="space-y-2.5">
              {d.recentActivity.slice(0, 6).map((log: any) => (
                <div key={log._id} className="flex items-start gap-3 rounded-lg border border-sb-ink/10 bg-white p-3">
                  <div className="w-7 h-7 rounded-lg bg-sb-orange/15 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5 text-sb-orange" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-sb-ink truncate">{log.description}</p>
                    <p className="text-[10px] text-sb-ink/50 mt-0.5">
                      {log.module} · {log.action} · {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sb-ink/45 text-sm text-center py-8">No recent activity.</p>
          )}
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Product", to: adminPath("products", "create"), primary: true },
              { label: "Set Pricing", to: adminPath("pricing") },
              { label: "Adjust Inventory", to: adminPath("inventory") },
              { label: "Add Brand", to: adminPath("brands") },
              { label: "Add Category", to: adminPath("categories") },
              { label: "Add City", to: adminPath("cities") },
              { label: "Assign Vendors", to: adminPath("orders") },
              { label: "View RFQs", to: adminPath("rfqs") },
            ].map(({ label, to, primary }) => (
              <Link key={label} to={to}
                className={`flex items-center justify-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${primary
                  ? "bg-sb-orange hover:bg-sb-orange-hover text-white"
                  : "border border-sb-ink/12 text-sb-ink/65 hover:border-sb-orange/40 hover:text-sb-orange bg-white"
                }`}>
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-sb-ink/10">
            <p className="text-xs font-medium text-sb-ink/50 uppercase tracking-wider mb-3">System Badges</p>
            <div className="flex gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 rounded-full border border-sb-orange/25 bg-sb-orange/12 px-3 py-1.5 text-xs font-medium text-sb-orange">
                <Shield className="h-3 w-3" /> Structbay Assured
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sb-orange/15 text-sb-orange border border-sb-orange/20">
                <Zap className="w-3 h-3" /> Structbay Express
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
