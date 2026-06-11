import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, RefreshCw, Eye, UserPlus, Loader2, MessageCircle } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminPath } from "../../lib/portalRoutes";
import { DeliveryWorkflowGuide } from "../components/DeliveryWorkflowGuide";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[#FE5E00]/15 text-[#FE5E00] border-[#FE5E00]/25",
  PAID: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  VENDOR_ASSIGNMENT_PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  PROCESSING: "bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/25",
  READY_FOR_DISPATCH: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  PARTIALLY_DISPATCHED: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  DISPATCHED: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  PARTIALLY_DELIVERED: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  DELIVERED: "bg-green-500/15 text-green-400 border-green-500/20",
  COMPLETED: "bg-green-600/15 text-green-300 border-green-600/25",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/20",
  RETURNED: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const PAY_COLORS: Record<string, string> = {
  PENDING: "text-[#FE5E00]",
  PAID: "text-green-400",
  FAILED: "text-red-400",
  REFUNDED: "text-[#C9A227]",
};

const ALL_STATUSES = [
  "PENDING", "PAID", "VENDOR_ASSIGNMENT_PENDING", "PROCESSING", "READY_FOR_DISPATCH",
  "PARTIALLY_DISPATCHED", "DISPATCHED", "PARTIALLY_DELIVERED", "DELIVERED", "COMPLETED",
  "CANCELLED", "RETURNED",
];

function buildLogisticsDraft(vos: any[] | undefined) {
  const m: Record<string, { pickupScheduledText: string; companyName: string; driverContactDetails: string }> = {};
  if (!vos) return m;
  for (const vo of vos) {
    m[vo._id] = {
      pickupScheduledText: vo.structbayLogistics?.pickupScheduledText ?? "",
      companyName: vo.structbayLogistics?.companyName ?? "",
      driverContactDetails: vo.structbayLogistics?.driverContactDetails ?? "",
    };
  }
  return m;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-2xl max-h-[min(92vh,900px)] my-auto flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-[#1A1A1A] rounded-t-xl">
          <h3 className="font-bold text-[#F4E9D8] pr-2 break-words">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl shrink-0">
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function OrderManagement() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, dispatched: 0, delivered: 0, cancelled: 0 });
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [detailLoading, setDetailLoading] = useState(false);
  const [logisticsDraft, setLogisticsDraft] = useState<Record<string, { pickupScheduledText: string; companyName: string; driverContactDetails: string }>>({});

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(decodeURIComponent(q));
  }, [searchParams]);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    apiFetch(`/orders?${params}`)
      .then(d => { setOrders(d.data || []); setPagination(d.pagination || {}); })
      .catch(() => { setOrders([]); setPagination({ total: 0, pages: 1, page: 1 }); })
      .finally(() => setLoading(false));
    apiFetch("/orders/stats")
      .then(d => setStats(d.data))
      .catch(() => setStats({ total: 0, pending: 0, processing: 0, dispatched: 0, delivered: 0, cancelled: 0 }));
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

  const openOrder = async (order: any) => {
    setSelected(order);
    setDetailLoading(true);
    try {
      const d = await apiFetch(`/orders/${order._id}`);
      if (d.data) {
        setSelected(d.data);
        setLogisticsDraft(buildLogisticsDraft(d.data.vendorOrders));
      }
    } catch {
      /* keep row snapshot */
    } finally {
      setDetailLoading(false);
    }
  };

  const saveStructbayLogistics = async (voId: string) => {
    const body = logisticsDraft[voId];
    if (!body) return;
    await apiFetch(`/admin/vendor-orders/${voId}`, {
      method: "PUT",
      body: JSON.stringify({ structbayLogistics: body }),
    }).catch((e: Error) => alert(e.message));
    if (selected?._id) openOrder({ _id: selected._id });
  };

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#F4E9D8]">Order Management</h1>
        <p className="text-[#D4C4A8]/60 text-sm mt-1">Central order processing, vendor assignment & status tracking</p>
      </div>

      <DeliveryWorkflowGuide />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Orders", value: stats.total ?? 0, color: "text-[#F4E9D8]" },
          { label: "Pending", value: stats.pending ?? 0, color: "text-[#FE5E00]" },
          { label: "Processing", value: stats.processing ?? 0, color: "text-[#C9A227]" },
          { label: "Dispatched", value: stats.dispatched ?? 0, color: "text-purple-400" },
          { label: "Delivered", value: stats.delivered ?? 0, color: "text-green-400" },
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
          <div className="px-4 py-2 border-b border-white/8 flex flex-wrap items-center justify-between gap-2 text-xs text-[#D4C4A8]/60">
            <span>
              {pagination.total
                ? `Showing ${(pagination.page - 1) * (pagination.limit || 50) + 1}–${Math.min(
                    pagination.page * (pagination.limit || 50),
                    pagination.total
                  )} of ${pagination.total}`
                : `${orders.length} order(s)`}
            </span>
            {pagination.pages > 1 && (
              <span className="text-[#D4C4A8]/45">
                Page {pagination.page} / {pagination.pages}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1080px]">
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
                        : <button onClick={() => openOrder(order)}
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
                      <button onClick={() => openOrder(order)}
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

      {!loading && pagination.pages > 1 && (
        <div className="flex justify-center flex-wrap gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => load(p)}
              className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                p === pagination.page
                  ? "bg-[#FE5E00] text-black"
                  : "bg-[#1A1A1A] border border-white/10 text-[#D4C4A8] hover:border-[#FE5E00]/50"
              }`}
            >
              {p}
            </button>
          ))}
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
              <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-white/8 p-1">
                {selected.items?.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3 bg-[#0D0D0D] border border-white/8 rounded-lg"
                  >
                    <p className="text-sm text-[#F4E9D8] break-words min-w-0 flex-1">{item.name}</p>
                    <p className="text-sm text-[#D4C4A8]/70 shrink-0">Qty: {item.quantity}</p>
                  </div>
                ))}
              </div>
            </div>

            {detailLoading && (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#FE5E00]" /></div>
            )}

            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Customer delivery details</p>
              <p className="text-[11px] text-[#D4C4A8]/45 mb-2">Shown on customer order tracking (separate from internal admin notes).</p>
              <textarea
                className="w-full min-h-[96px] bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00]"
                placeholder="e.g. Porter pickup 4–6 PM; driver Rajesh 98765-xxxxx; partial cement delivered 12 bags…"
                value={selected.deliveryDetails ?? ""}
                onChange={e => setSelected((p: any) => ({ ...p, deliveryDetails: e.target.value }))}
              />
              <button
                type="button"
                onClick={async () => {
                  await apiFetch(`/orders/${selected._id}/edit`, {
                    method: "PATCH",
                    body: JSON.stringify({ deliveryDetails: selected.deliveryDetails ?? "" }),
                  }).catch((e: Error) => alert(e.message));
                  load();
                }}
                className="mt-2 px-4 py-2 rounded-lg bg-[#FE5E00]/15 text-[#FE5E00] text-xs font-semibold border border-[#FE5E00]/25 hover:bg-[#FE5E00]/25"
              >
                Save delivery details
              </button>
            </div>

            <Link
              to={adminPath("orders", selected._id, "chat")}
              className="inline-flex items-center gap-2 text-sm text-[#FE5E00] hover:underline font-medium"
            >
              <MessageCircle className="w-4 h-4" /> Order chat (admin ↔ customer)
            </Link>

            {selected.vendorOrders?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Delivery type (per vendor line)</p>
                <div className="space-y-2 mb-3">
                  {selected.vendorOrders.map((vo: any) => (
                    <div
                      key={vo._id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#111] border border-white/10 rounded-lg text-xs"
                    >
                      <span className="font-mono text-[#FE5E00]/90">{vo.orderNumber}</span>
                      <span className="text-[#D4C4A8]/80">
                        {vo.deliveryType === "structbay_delivery"
                          ? "Type B — StructBay delivery"
                          : "Type A — Vendor delivery"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Vendor sub-orders</p>
                <p className="text-[11px] text-[#D4C4A8]/45 mb-3">StructBay delivery: enter pickup window, logistics company, and driver contact after booking Porter/Delhivery.</p>
                <div className="space-y-3">
                  {selected.vendorOrders.map((vo: any) => (
                    <div key={vo._id} className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg space-y-2">
                      <p className="text-xs font-mono text-[#FE5E00]">
                        {vo.orderNumber} ·{" "}
                        {vo.deliveryType === "structbay_delivery" ? "Type B — StructBay" : "Type A — Vendor"}
                      </p>
                      {vo.deliveryType === "structbay_delivery" && (
                        <>
                          <input
                            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4E9D8]"
                            placeholder="Pickup scheduled (time / window)"
                            value={logisticsDraft[vo._id]?.pickupScheduledText ?? ""}
                            onChange={e => setLogisticsDraft(prev => ({
                              ...prev,
                              [vo._id]: { ...prev[vo._id], pickupScheduledText: e.target.value, companyName: prev[vo._id]?.companyName ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                            }))}
                          />
                          <input
                            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4E9D8]"
                            placeholder="Company (Porter / Delhivery / …)"
                            value={logisticsDraft[vo._id]?.companyName ?? ""}
                            onChange={e => setLogisticsDraft(prev => ({
                              ...prev,
                              [vo._id]: { ...prev[vo._id], companyName: e.target.value, pickupScheduledText: prev[vo._id]?.pickupScheduledText ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                            }))}
                          />
                          <input
                            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4E9D8]"
                            placeholder="Driver / coordinator contact"
                            value={logisticsDraft[vo._id]?.driverContactDetails ?? ""}
                            onChange={e => setLogisticsDraft(prev => ({
                              ...prev,
                              [vo._id]: { ...prev[vo._id], driverContactDetails: e.target.value, pickupScheduledText: prev[vo._id]?.pickupScheduledText ?? "", companyName: prev[vo._id]?.companyName ?? "" },
                            }))}
                          />
                          <button
                            type="button"
                            onClick={() => saveStructbayLogistics(vo._id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FE5E00] text-[#0D0D0D]"
                          >
                            Save logistics
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update Status */}
            <div>
              <p className="text-xs font-semibold text-[#D4C4A8]/60 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateStatus(selected._id, s)}
                    className={`py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors text-left break-words leading-snug ${
                      selected.status === s
                        ? "bg-[#FE5E00] text-[#0D0D0D] border-[#FE5E00]"
                        : "border-white/10 text-[#D4C4A8]/70 hover:border-[#FE5E00]/40 hover:text-[#FE5E00]"
                    }`}
                  >
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
