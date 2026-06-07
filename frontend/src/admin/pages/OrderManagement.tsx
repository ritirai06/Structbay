import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Eye, UserPlus, Loader2, CheckCircle, XCircle, ChevronDown } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("adminToken") || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "API Error");
  return data;
}

const DEMO_ORDERS = [
  { _id: "1", orderNumber: "ORD202506040001", customer: { name: "ABC Builders", phone: "+91 98765 43210" }, city: { name: "Bengaluru" }, items: [{ name: "Cement PPC 53 Grade", quantity: 100 }, { name: "TMT Steel Bars", quantity: 50 }], subtotal: 42000, grandTotal: 49560, status: "PENDING", paymentStatus: "PENDING", assignedVendor: null, createdAt: "2026-06-04" },
  { _id: "2", orderNumber: "ORD202506040002", customer: { name: "XYZ Construction", phone: "+91 98765 43211" }, city: { name: "Hyderabad" }, items: [{ name: "Ready Mix M30", quantity: 30 }], subtotal: 156000, grandTotal: 184080, status: "PROCESSING", paymentStatus: "PAID", assignedVendor: { name: "ABC Suppliers", companyName: "ABC Suppliers Pvt Ltd" }, createdAt: "2026-06-04" },
  { _id: "3", orderNumber: "ORD202506030003", customer: { name: "PQR Developers", phone: "+91 98765 43212" }, city: { name: "Chennai" }, items: [{ name: "Red Clay Bricks", quantity: 5000 }], subtotal: 35000, grandTotal: 41300, status: "DISPATCHED", paymentStatus: "PAID", assignedVendor: { name: "PQR Materials", companyName: "PQR Materials Ltd" }, createdAt: "2026-06-03" },
  { _id: "4", orderNumber: "ORD202506020004", customer: { name: "LMN Contractors", phone: "+91 98765 43213" }, city: { name: "Bengaluru" }, items: [{ name: "Cement OPC 43 Grade", quantity: 200 }], subtotal: 80000, grandTotal: 94400, status: "DELIVERED", paymentStatus: "PAID", assignedVendor: { name: "ABC Suppliers", companyName: "ABC Suppliers Pvt Ltd" }, createdAt: "2026-06-02" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25",
  CONFIRMED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PROCESSING: "bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/25",
  DISPATCHED: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  OUT_FOR_DELIVERY: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  DELIVERED: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/20",
  RETURNED: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const PAY_COLORS: Record<string, string> = {
  PENDING: "text-[#FE5E00]",
  PAID: "text-green-400",
  FAILED: "text-red-400",
  REFUNDED: "text-[#C9A227]",
};

const ALL_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A1A]">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function OrderManagement() {
  const [orders, setOrders] = useState<any[]>(DEMO_ORDERS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, dispatched: 0, delivered: 0 });
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    apiFetch(`/orders?${params}`)
      .then(d => { setOrders(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setOrders(DEMO_ORDERS); setPagination({ total: DEMO_ORDERS.length, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
    apiFetch("/orders/stats")
      .then(d => setStats(d.data))
      .catch(() => setStats({ total: 180, pending: 23, processing: 45, dispatched: 12, delivered: 112 }));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string, note = "") => {
    await apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) }).catch(e => alert(e.message));
    load();
    if (selected?._id === orderId) setSelected((prev: any) => prev ? { ...prev, status } : null);
  };

  const assignVendor = async (orderId: string, vendorId: string) => {
    await apiFetch(`/orders/${orderId}/assign-vendor`, { method: "PATCH", body: JSON.stringify({ vendorId }) }).catch(e => alert(e.message));
    load();
  };

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Order Management</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Central order processing, vendor assignment & status tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Orders", value: stats.total || 180, color: "text-[#F4E9D8]" },
          { label: "Pending", value: stats.pending || 23, color: "text-[#FE5E00]" },
          { label: "Processing", value: stats.processing || 45, color: "text-[#C9A227]" },
          { label: "Dispatched", value: stats.dispatched || 12, color: "text-purple-400" },
          { label: "Delivered", value: stats.delivered || 112, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#D4C4A8]/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order number..."
            className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors">
          <option value="">All Status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => load()} className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>
      ) : (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Order ID", "Customer", "City", "Items", "Total", "Vendor", "Payment", "Status", "Date", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-[#FE5E00] font-bold">{order.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[#F4E9D8]">{order.customer?.name}</p>
                      <p className="text-xs text-[#D4C4A8]/50">{order.customer?.phone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[#D4C4A8]/70">{order.city?.name}</td>
                    <td className="py-3.5 px-4 text-[#D4C4A8]/70">{order.items?.length}</td>
                    <td className="py-3.5 px-4 font-bold text-[#F4E9D8]">₹{order.grandTotal?.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      {order.assignedVendor
                        ? <span className="text-xs text-[#D4C4A8]/70">{order.assignedVendor.companyName || order.assignedVendor.name}</span>
                        : <button onClick={() => setSelected(order)}
                            className="flex items-center gap-1.5 text-xs bg-[#FE5E00]/10 text-[#FE5E00] border border-[#FE5E00]/20 px-2.5 py-1 rounded-lg hover:bg-[#FE5E00]/20 transition-colors">
                            <UserPlus className="w-3 h-3" /> Assign
                          </button>
                      }
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-bold ${PAY_COLORS[order.paymentStatus] || "text-[#D4C4A8]/60"}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[order.status] || "bg-white/8 text-[#D4C4A8]/60 border-white/12"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#D4C4A8]/50">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <button onClick={() => setSelected(order)}
                        className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-white/20 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <Modal title={`Order — ${selected.orderNumber}`} onClose={() => setSelected(null)}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                <p className="text-xs text-[#D4C4A8]/50 mb-1">Customer</p>
                <p className="font-semibold text-[#F4E9D8]">{selected.customer?.name}</p>
                <p className="text-xs text-[#D4C4A8]/60">{selected.customer?.phone}</p>
              </div>
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                <p className="text-xs text-[#D4C4A8]/50 mb-1">City / Total</p>
                <p className="font-semibold text-[#F4E9D8]">{selected.city?.name}</p>
                <p className="text-lg font-black text-[#FE5E00]">₹{selected.grandTotal?.toLocaleString()}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Order Items</p>
              <div className="space-y-2">
                {selected.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                    <p className="text-sm text-[#F4E9D8]">{item.name}</p>
                    <p className="text-sm text-[#D4C4A8]/70">Qty: {item.quantity}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Status */}
            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-3 gap-2">
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => updateStatus(selected._id, s)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${selected.status === s ? "bg-[#FE5E00] text-[#0D0D0D] border-[#FE5E00]" : "border-white/10 text-[#D4C4A8]/70 hover:border-[#FE5E00]/40 hover:text-[#FE5E00]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Vendor */}
            {!selected.assignedVendor && (
              <div>
                <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Assign Vendor</p>
                <p className="text-xs text-[#D4C4A8]/50">Enter vendor ID to assign. In production, this is a searchable vendor list.</p>
                <div className="flex gap-2 mt-2">
                  <input id="vendorId" className="flex-1 bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] focus:outline-none focus:border-[#FE5E00]"
                    placeholder="Vendor User ID" />
                  <button onClick={() => {
                    const v = (document.getElementById("vendorId") as HTMLInputElement)?.value;
                    if (v) assignVendor(selected._id, v);
                  }} className="px-4 py-2 bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-bold rounded-lg text-sm transition-colors">
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
