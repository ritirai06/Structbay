import {
  DollarSign, ShoppingCart, Users, Package,
  TrendingUp, AlertCircle, CheckCircle, Clock,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { chartColors } from "@shared/constants/colors";

const revenueData = [
  { month: "Jan", revenue: 45000, orders: 120 },
  { month: "Feb", revenue: 52000, orders: 140 },
  { month: "Mar", revenue: 48000, orders: 130 },
  { month: "Apr", revenue: 61000, orders: 165 },
  { month: "May", revenue: 55000, orders: 150 },
  { month: "Jun", revenue: 67000, orders: 180 },
];

const categoryData = [
  { name: "Cement",   value: 35, color: "#FE5E00" },
  { name: "Steel",    value: 25, color: "#C9A227" },
  { name: "Concrete", value: 20, color: "#EADCC6" },
  { name: "Bricks",   value: 12, color: "#E05200" },
  { name: "Others",   value: 8,  color: "#D4C4A8" },
];

const cityRevenueData = [
  { city: "Bengaluru", revenue: 28000 },
  { city: "Hyderabad", revenue: 22000 },
  { city: "Chennai",   revenue: 17000 },
];

const recentOrders = [
  { id: "ORD-1234", customer: "ABC Builders",      amount: 45000, status: "Pending",    date: "2026-06-04" },
  { id: "ORD-1235", customer: "XYZ Construction",  amount: 32000, status: "Processing", date: "2026-06-04" },
  { id: "ORD-1236", customer: "PQR Developers",    amount: 58000, status: "Delivered",  date: "2026-06-03" },
  { id: "ORD-1237", customer: "LMN Contractors",   amount: 41000, status: "Pending",    date: "2026-06-03" },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending:    "bg-[#FE5E00]/15 text-[#FE5E00] border border-[#FE5E00]/25",
    Processing: "bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/25",
    Delivered:  "bg-green-500/15 text-green-400 border border-green-500/20",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-white/10 text-[#D4C4A8]"}`;
};

function StatCard({ title, value, icon: Icon, sub, subColor = "text-[#D4C4A8]/50" }: {
  title: string; value: string; icon: any; sub: string; subColor?: string;
}) {
  return (
    <div className="bg-[#222222] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/60">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-[#FE5E00]/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#FE5E00]" />
        </div>
      </div>
      <div className="text-2xl font-black text-[#F4E9D8]">{value}</div>
      <p className={`text-xs mt-1.5 flex items-center gap-1 ${subColor}`}>{sub}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#222222] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8">
        <h3 className="font-semibold text-[#F4E9D8] text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Dashboard() {
  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-7">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Dashboard</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Welcome to StructBay Admin Portal</p>
      </div>

      {/* Primary Stats */}
      <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue"   value="₹67,000" icon={DollarSign}  sub="+12.5% from last month" subColor="text-green-400" />
        <StatCard title="Total Orders"    value="180"      icon={ShoppingCart} sub="45 pending dispatch" />
        <StatCard title="Active Vendors"  value="38"       icon={Users}        sub="Across 3 cities" />
        <StatCard title="Total Products"  value="450"      icon={Package}      sub="12 low stock items" subColor="text-red-400" />
      </div>

      {/* Secondary Stats */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard title="Pending RFQs"    value="23" icon={TrendingUp}  sub="Awaiting response" />
        <StatCard title="Bulk Enquiries"  value="15" icon={Package}     sub="This week" />
        <StatCard title="Finance Leads"   value="8"  icon={DollarSign}  sub="Qualified leads" />
      </div>

      {/* Charts row */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,233,216,0.06)" />
              <XAxis dataKey="month" stroke="#D4C4A8" tick={{ fill: "#D4C4A8", fontSize: 11 }} />
              <YAxis stroke="#D4C4A8" tick={{ fill: "#D4C4A8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#222222", border: "1px solid rgba(244,233,216,0.15)", borderRadius: "8px", color: "#F4E9D8" }} />
              <Legend wrapperStyle={{ color: "#D4C4A8", fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" stroke="#FE5E00" strokeWidth={2.5} dot={{ fill: "#FE5E00", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="City-wise Revenue">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cityRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,233,216,0.06)" />
              <XAxis dataKey="city" stroke="#D4C4A8" tick={{ fill: "#D4C4A8", fontSize: 11 }} />
              <YAxis stroke="#D4C4A8" tick={{ fill: "#D4C4A8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#222222", border: "1px solid rgba(244,233,216,0.15)", borderRadius: "8px", color: "#F4E9D8" }} />
              <Bar dataKey="revenue" fill="#FE5E00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Top Categories">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={90}
                dataKey="value"
              >
                {categoryData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#222222", border: "1px solid rgba(244,233,216,0.15)", borderRadius: "8px", color: "#F4E9D8" }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Recent Orders */}
        <Panel title="Recent Orders">
          <div className="space-y-2.5">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-[#171717] border border-white/6 hover:border-white/12 transition-colors">
                <div>
                  <p className="font-semibold text-sm text-[#F4E9D8]">{order.id}</p>
                  <p className="text-xs text-[#D4C4A8]/60">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-[#F4E9D8]">₹{order.amount.toLocaleString()}</p>
                  <span className={statusBadge(order.status)}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Quick Actions */}
      <Panel title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <button className="bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
            Add Product
          </button>
          {["Assign Vendor", "Create Brand", "Create Category", "Update Inventory"].map(label => (
            <button key={label} className="bg-transparent border border-white/15 hover:border-[#FE5E00]/50 hover:text-[#FE5E00] text-[#D4C4A8] font-medium px-4 py-2.5 rounded-lg text-sm transition-all">
              {label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
