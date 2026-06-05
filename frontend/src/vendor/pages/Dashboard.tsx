import { Link } from "react-router";
import {
  Package, Clock, Truck, CheckCircle,
  FileText, Upload, Send, Download,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { mockOrders } from "../data/mockData";

export function Dashboard() {
  const stats = {
    assigned:       mockOrders.length,
    pending:        mockOrders.filter(o => o.status === "assigned").length,
    readyDispatch:  mockOrders.filter(o => o.status === "ready_dispatch").length,
    dispatched:     mockOrders.filter(o => o.status === "dispatched").length,
    completed:      mockOrders.filter(o => o.status === "delivered").length,
    pendingInvoice: mockOrders.filter(o => !o.invoiceNumber).length,
  };

  return (
    <div className="space-y-6 bg-[#0D0D0D] min-h-full">
      <div>
        <h1 className="text-2xl font-black text-[#F4E9D8]">Dashboard</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Welcome back! Here's your operational overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Assigned Orders"   value={stats.assigned}       icon={Package}      color="bg-orange-100 text-orange-600" />
        <StatCard title="Pending Orders"          value={stats.pending}        icon={Clock}        color="bg-orange-100 text-orange-600" />
        <StatCard title="Ready for Dispatch"      value={stats.readyDispatch}  icon={Truck}        color="bg-purple-100 text-purple-600" />
        <StatCard title="Dispatched"              value={stats.dispatched}     icon={Send}         color="bg-cyan-100 text-cyan-600" />
        <StatCard title="Completed Orders"        value={stats.completed}      icon={CheckCircle}  color="bg-green-100 text-green-600" />
        <StatCard title="Pending Invoice Upload"  value={stats.pendingInvoice} icon={FileText}     color="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/orders",                        icon: Package,  label: "View Orders" },
              { to: "/orders/ORD-2024-001/invoice",   icon: Upload,   label: "Upload Invoice" },
              { to: "/dispatch",                      icon: Truck,    label: "Dispatch Material" },
              { to: "/documents",                     icon: Download, label: "Download Documents" },
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center p-5 border border-white/10 rounded-xl hover:border-[#FE5E00]/50 hover:bg-[#FE5E00]/8 transition-all group"
              >
                <Icon className="w-7 h-7 text-[#FE5E00] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-[#F4E9D8]">{label}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity">
          <div className="space-y-2.5">
            {mockOrders.slice(0, 4).map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between p-3.5 border border-white/8 rounded-lg hover:border-[#FE5E00]/30 hover:bg-[#2A2A2A] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#F4E9D8]">{order.id}</p>
                  <p className="text-xs text-[#D4C4A8]/60 truncate">{order.customerName}</p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
          <Link
            to="/orders"
            className="block text-center text-sm text-[#FE5E00] hover:text-[#E05200] mt-4 font-semibold transition-colors"
          >
            View All Orders →
          </Link>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card title="Recent Orders">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["Order Number", "Customer Name", "Assigned Date", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockOrders.slice(0, 5).map(order => (
                <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F4E9D8]">{order.id}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">{order.customerName}</td>
                  <td className="py-3.5 px-4 text-[#D4C4A8]/70">
                    {new Date(order.assignedDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3.5 px-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3.5 px-4">
                    <Link to={`/orders/${order.id}`} className="text-sm text-[#FE5E00] hover:text-[#E05200] font-semibold transition-colors">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
