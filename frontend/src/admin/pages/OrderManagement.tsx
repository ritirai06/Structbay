import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, RefreshCw, Eye, UserPlus, Loader2, MessageCircle } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminPath } from "../../lib/portalRoutes";
import { DeliveryWorkflowGuide } from "../components/DeliveryWorkflowGuide";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  PAID: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  VENDOR_ASSIGNMENT_PENDING: "bg-sb-orange/10 text-sb-orange border-sb-orange/22",
  PROCESSING: "bg-sb-orange/15 text-sb-orange border-sb-orange/28",
  READY_FOR_DISPATCH: "bg-sb-cream-secondary text-sb-ink border-sb-ink/12",
  PARTIALLY_DISPATCHED: "bg-sb-cream text-sb-ink border-sb-orange/30",
  DISPATCHED: "bg-sb-orange/12 text-sb-orange border-sb-orange/25",
  PARTIALLY_DELIVERED: "bg-sb-cream-secondary text-sb-ink border-sb-orange/25",
  DELIVERED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/15",
  COMPLETED: "bg-sb-cream-secondary text-sb-ink border-sb-ink/15",
  CANCELLED: "bg-sb-cream-secondary text-sb-ink/60 border-sb-ink/15",
  RETURNED: "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12",
};

const PAY_COLORS: Record<string, string> = {
  PENDING: "text-sb-orange",
  PAID: "text-sb-ink",
  FAILED: "text-sb-ink/55",
  REFUNDED: "text-sb-orange",
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

type VendorRow = { _id: string; companyName?: string; name?: string; email?: string };

function vendorUserId(v: unknown): string {
  if (!v) return "";
  if (typeof v === "object" && v !== null && "_id" in v) return String((v as { _id: string })._id);
  return String(v);
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-2xl max-h-[min(92vh,900px)] my-auto flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 shrink-0 bg-sb-cream-secondary rounded-t-xl">
          <h3 className="font-bold text-sb-ink pr-2 break-words">{title}</h3>
          <button type="button" onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl shrink-0">
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvedVendors, setApprovedVendors] = useState<VendorRow[]>([]);
  const [vendorPick, setVendorPick] = useState("");
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [voDetailById, setVoDetailById] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!selected?._id) {
      setApprovedVendors([]);
      setVendorPick("");
      setVendorsLoading(false);
      return;
    }
    setVendorPick(vendorUserId(selected.assignedVendor));
  }, [selected]);

  useEffect(() => {
    if (!selected?._id) return;
    setVendorsLoading(true);
    const params = new URLSearchParams({ limit: "200", vendorStatus: "APPROVED" });
    void apiFetch(`/admin/vendors?${params}`)
      .then((d) => setApprovedVendors(Array.isArray(d.data) ? (d.data as VendorRow[]) : []))
      .catch(() => setApprovedVendors([]))
      .finally(() => setVendorsLoading(false));
  }, [selected?._id]);

  useEffect(() => {
    if (!selected?.vendorOrders?.length) {
      setVoDetailById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const m: Record<string, any> = {};
      for (const vo of selected.vendorOrders as any[]) {
        if (!vo?._id || vo.workflowVersion !== 2) continue;
        try {
          const d = await apiFetch(`/admin/vendor-orders/${vo._id}`);
          if (d.data) m[vo._id] = d.data;
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setVoDetailById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?._id, selected?.vendorOrders]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(decodeURIComponent(q));
  }, [searchParams]);

  const load = useCallback((page = 1) => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    const listP = apiFetch(`/orders?${params}`)
      .then((d) => {
        setOrders(d.data || []);
        setPagination(d.pagination || {});
      })
      .catch((e) => {
        setOrders([]);
        setPagination({ total: 0, pages: 1, page: 1 });
        setLoadError(e instanceof Error ? e.message : "Failed to load orders.");
      });

    const statsP = apiFetch("/orders/stats")
      .then((d) => {
        if (d.data && typeof d.data === "object") setStats(d.data as typeof stats);
      })
      .catch(() => {
        /* keep prior stats; list error is more important */
      });

    void Promise.all([listP, statsP]).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string, note = "") => {
    await apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) }).catch(e => alert(e.message));
    load();
    if (selected?._id === orderId) setSelected((prev: any) => prev ? { ...prev, status } : null);
  };

  const assignVendor = async (orderId: string, vendorId: string) => {
    try {
      await apiFetch(`/orders/${orderId}/assign-vendor`, { method: "PATCH", body: JSON.stringify({ vendorId }) });
      load();
      await openOrder({ _id: orderId });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assign failed");
    }
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
    <div className="p-6 bg-sb-cream min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-sb-ink">Order Management</h1>
        <p className="mt-1 text-sm text-sb-ink/55">Central order processing, vendor assignment & status tracking</p>
      </div>

      <DeliveryWorkflowGuide />
      {loadError && (
        <div className="mb-5 rounded-xl border border-sb-orange/30 bg-sb-orange/10 px-4 py-3 text-sm text-sb-ink">
          <p className="font-semibold">Could not load orders</p>
          <p className="mt-1 whitespace-pre-wrap text-sb-ink/90">{loadError}</p>
          <p className="mt-2 text-xs text-sb-ink/60">
            Sign in again as <strong>ADMIN</strong>, confirm the backend is running, and open the app via the Vite dev server so <code className="text-sb-orange/90">/api</code> proxies to the API.
          </p>
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Total Orders", value: stats.total ?? 0, color: "text-sb-ink", hint: "All non-deleted master orders" },
          { label: "Pending / queue", value: stats.pending ?? 0, color: "text-sb-orange", hint: "PENDING, PAID, or VENDOR_ASSIGNMENT_PENDING" },
          { label: "Processing", value: stats.processing ?? 0, color: "text-sb-orange", hint: "PROCESSING, READY_FOR_DISPATCH, PARTIALLY_DISPATCHED" },
          { label: "Dispatched", value: stats.dispatched ?? 0, color: "text-sb-ink", hint: "DISPATCHED or PARTIALLY_DELIVERED" },
          { label: "Delivered", value: stats.delivered ?? 0, color: "text-sb-ink", hint: "DELIVERED or COMPLETED" },
        ].map((s) => (
          <div
            key={s.label}
            title={s.hint}
            className="rounded-xl border border-sb-ink/10 bg-sb-cream-secondary p-4 text-center cursor-default"
          >
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-sb-ink/50">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-48 max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sb-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number..."
            className="w-full rounded-lg border border-sb-ink/15 bg-sb-cream py-2 pl-9 pr-4 text-sm text-sb-ink placeholder:text-sb-ink/40 transition-colors focus:border-sb-orange focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-sb-ink/15 bg-sb-cream px-3 py-2 text-sm text-sb-ink focus:border-sb-orange focus:outline-none"
        >
          <option value="">All Status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-sb-ink/15 bg-sb-cream-secondary p-2 text-sb-ink/55 transition-colors hover:text-sb-orange"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sb-ink/10 bg-sb-cream-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sb-ink/10 px-4 py-2 text-xs text-sb-ink/55">
            <span>
              {pagination.total
                ? `Showing ${(pagination.page - 1) * (pagination.limit || 50) + 1}–${Math.min(
                    pagination.page * (pagination.limit || 50),
                    pagination.total
                  )} of ${pagination.total}`
                : `${orders.length} order(s)`}
            </span>
            {pagination.pages > 1 && (
              <span className="text-sb-ink/45">
                Page {pagination.page} / {pagination.pages}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1080px]">
              <thead>
                <tr className="border-b border-sb-ink/10">
                  {["Order ID", "Customer", "City", "Items", "Total", "Vendor", "Payment", "Status", "Date", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-sb-orange font-bold">{order.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-sb-ink">{order.customer?.name}</p>
                      <p className="text-xs text-sb-ink/50">{order.customer?.phone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-sb-ink/65">{order.city?.name}</td>
                    <td className="py-3.5 px-4 text-sb-ink/65">{order.items?.length}</td>
                    <td className="py-3.5 px-4 font-bold text-sb-ink">₹{order.grandTotal?.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      {order.assignedVendor
                        ? <span className="text-xs text-sb-ink/65">{order.assignedVendor.companyName || order.assignedVendor.name}</span>
                        : <button onClick={() => openOrder(order)}
                            className="flex items-center gap-1.5 text-xs bg-sb-orange/10 text-sb-orange border border-sb-orange/20 px-2.5 py-1 rounded-lg hover:bg-sb-orange/20 transition-colors">
                            <UserPlus className="w-3 h-3" /> Assign
                          </button>
                      }
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-bold ${PAY_COLORS[order.paymentStatus] || "text-sb-ink/55"}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[order.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-sb-ink/50">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <button onClick={() => openOrder(order)}
                        className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={10} className="py-14 px-4 text-center text-sm text-sb-ink/55 leading-relaxed max-w-xl mx-auto">
                      {loadError
                        ? "Fix the error above, then refresh."
                        : "No orders match the current filters. New customer checkouts appear here (master orders). Clear the status filter or search — if you still see nothing while customers have ordered, confirm this admin session uses the same API/database as checkout."}
                    </td>
                  </tr>
                )}
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
                  ? "bg-sb-orange text-black"
                  : "bg-sb-cream-secondary border border-sb-ink/10 text-sb-ink/60 hover:border-sb-orange/50"
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
              <div className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                <p className="text-xs text-sb-ink/50 mb-1">Customer</p>
                <p className="font-semibold text-sb-ink">{selected.customer?.name}</p>
                <p className="text-xs text-sb-ink/55">{selected.customer?.phone}</p>
              </div>
              <div className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                <p className="text-xs text-sb-ink/50 mb-1">City / Total</p>
                <p className="font-semibold text-sb-ink">{selected.city?.name}</p>
                <p className="text-lg font-black text-sb-orange">₹{selected.grandTotal?.toLocaleString()}</p>
              </div>
            </div>
            {selected.customerVendorFulfillmentMilestone && (
              <div className="rounded-lg border border-sb-orange/20 bg-sb-orange/5 px-3 py-2 text-xs text-sb-ink">
                <span className="text-sb-ink/55">Customer milestone (from vendor sub-orders): </span>
                <span className="font-bold text-sb-orange">{selected.customerVendorFulfillmentMilestone}</span>
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Order Items</p>
              <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-sb-ink/10 p-1">
                {selected.items?.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3 bg-sb-cream border border-sb-ink/10 rounded-lg"
                  >
                    <p className="text-sm text-sb-ink break-words min-w-0 flex-1">{item.name}</p>
                    <p className="text-sm text-sb-ink/65 shrink-0">Qty: {item.quantity}</p>
                  </div>
                ))}
              </div>
            </div>

            {detailLoading && (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-sb-orange" /></div>
            )}

            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Customer delivery details</p>
              <p className="text-[11px] text-sb-ink/45 mb-2">Shown on customer order tracking (separate from internal admin notes).</p>
              <textarea
                className="w-full min-h-[96px] bg-sb-cream border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange"
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
                className="mt-2 px-4 py-2 rounded-lg bg-sb-orange/15 text-sb-orange text-xs font-semibold border border-sb-orange/25 hover:bg-sb-orange/25"
              >
                Save delivery details
              </button>
            </div>

            <Link
              to={adminPath("orders", selected._id, "chat")}
              className="inline-flex items-center gap-2 text-sm text-sb-orange hover:underline font-medium"
            >
              <MessageCircle className="w-4 h-4" /> Order chat (admin ↔ customer)
            </Link>

            {selected.vendorOrders?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Delivery type (per vendor line)</p>
                <div className="space-y-2 mb-3">
                  {selected.vendorOrders.map((vo: any) => (
                    <div
                      key={vo._id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#111] border border-sb-ink/10 rounded-lg text-xs"
                    >
                      <span className="font-mono text-sb-orange">{vo.orderNumber}</span>
                      <span className="text-sb-ink/70">
                        {vo.deliveryType === "structbay_delivery"
                          ? "Type B — StructBay delivery"
                          : "Type A — Vendor delivery"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Vendor sub-orders</p>
                <p className="text-[11px] text-sb-ink/45 mb-3">StructBay delivery: enter pickup window, logistics company, and driver contact after booking Porter/Delhivery.</p>
                <div className="space-y-3">
                  {selected.vendorOrders.map((vo: any) => (
                    <div key={vo._id} className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg space-y-2">
                      <p className="text-xs font-mono text-sb-orange">
                        {vo.orderNumber} ·{" "}
                        {vo.deliveryType === "structbay_delivery" ? "Type B — StructBay" : "Type A — Vendor"}
                      </p>
                      {vo.deliveryType === "structbay_delivery" && (
                        <>
                          <input
                            className="w-full bg-[#111] border border-sb-ink/10 rounded-lg px-3 py-2 text-xs text-sb-ink"
                            placeholder="Pickup scheduled (time / window)"
                            value={logisticsDraft[vo._id]?.pickupScheduledText ?? ""}
                            onChange={e => setLogisticsDraft(prev => ({
                              ...prev,
                              [vo._id]: { ...prev[vo._id], pickupScheduledText: e.target.value, companyName: prev[vo._id]?.companyName ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                            }))}
                          />
                          <input
                            className="w-full bg-[#111] border border-sb-ink/10 rounded-lg px-3 py-2 text-xs text-sb-ink"
                            placeholder="Company (Porter / Delhivery / …)"
                            value={logisticsDraft[vo._id]?.companyName ?? ""}
                            onChange={e => setLogisticsDraft(prev => ({
                              ...prev,
                              [vo._id]: { ...prev[vo._id], companyName: e.target.value, pickupScheduledText: prev[vo._id]?.pickupScheduledText ?? "", driverContactDetails: prev[vo._id]?.driverContactDetails ?? "" },
                            }))}
                          />
                          <input
                            className="w-full bg-[#111] border border-sb-ink/10 rounded-lg px-3 py-2 text-xs text-sb-ink"
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
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sb-orange text-white"
                          >
                            Save logistics
                          </button>
                        </>
                      )}
                      {vo.workflowVersion === 2 && (
                        <div className="mt-2 pt-2 border-t border-sb-ink/10 space-y-2">
                          <p className="text-[11px] font-semibold text-sb-orange">Vendor workflow · {vo.status}</p>
                          <div className="flex flex-wrap gap-2">
                            {vo.status === "READY_FOR_DISPATCH" && (
                              <>
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-sb-orange text-black font-bold"
                                  onClick={async () => {
                                    await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/approve-dispatch`, { method: "POST" }).catch(e => alert(e.message));
                                    await openOrder({ _id: selected._id });
                                  }}
                                >
                                  Approve dispatch
                                </button>
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1 rounded border border-sb-ink/20 text-sb-ink"
                                  onClick={async () => {
                                    const note = window.prompt("Change request note for vendor");
                                    if (!note) return;
                                    await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/request-changes`, {
                                      method: "POST",
                                      body: JSON.stringify({ note }),
                                    }).catch(e => alert(e.message));
                                    await openOrder({ _id: selected._id });
                                  }}
                                >
                                  Request changes
                                </button>
                              </>
                            )}
                            {vo.status === "DELIVERED" && (
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded bg-sb-orange text-black font-bold"
                                onClick={async () => {
                                  await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/confirm-delivery`, { method: "POST" }).catch(e => alert(e.message));
                                  await openOrder({ _id: selected._id });
                                }}
                              >
                                Confirm delivery
                              </button>
                            )}
                          </div>
                          {vo.status === "VENDOR_INVOICE_SUBMITTED" && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-sb-ink/55">
                                StructBay invoice PDF + e-way PDF (fields: sbInvoice, ewayBill). Numbers required.
                              </p>
                              <input type="file" id={`sb-${vo._id}-inv`} accept="application/pdf,.pdf" className="text-[10px] w-full" />
                              <input type="file" id={`sb-${vo._id}-ew`} accept="application/pdf,.pdf" className="text-[10px] w-full" />
                              <div className="flex gap-2">
                                <input id={`sb-${vo._id}-inum`} placeholder="SB invoice #" className="flex-1 text-xs px-2 py-1 rounded border border-sb-ink/15 bg-sb-cream text-sb-ink" />
                                <input id={`sb-${vo._id}-enum`} placeholder="E-way #" className="flex-1 text-xs px-2 py-1 rounded border border-sb-ink/15 bg-sb-cream text-sb-ink" />
                              </div>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded bg-sb-orange text-black font-bold"
                                onClick={async () => {
                                  const invEl = document.getElementById(`sb-${vo._id}-inv`) as HTMLInputElement | null;
                                  const ewEl = document.getElementById(`sb-${vo._id}-ew`) as HTMLInputElement | null;
                                  const inum = (document.getElementById(`sb-${vo._id}-inum`) as HTMLInputElement | null)?.value;
                                  const enumv = (document.getElementById(`sb-${vo._id}-enum`) as HTMLInputElement | null)?.value;
                                  if (!invEl?.files?.[0] || !ewEl?.files?.[0] || !inum || !enumv) {
                                    alert("Both PDFs and both numbers are required.");
                                    return;
                                  }
                                  const fd = new FormData();
                                  fd.append("sbInvoice", invEl.files[0]);
                                  fd.append("ewayBill", ewEl.files[0]);
                                  fd.append("invoice_number", inum);
                                  fd.append("eway_bill_number", enumv);
                                  await apiFetch(`/admin/vendor-orders/${vo._id}/workflow/sb-docs`, { method: "POST", body: fd }).catch(e => alert(e.message));
                                  await openOrder({ _id: selected._id });
                                }}
                              >
                                Send SB invoice & e-way
                              </button>
                            </div>
                          )}
                          {voDetailById[vo._id]?.statusAudits?.length > 0 && (
                            <div className="max-h-28 overflow-y-auto text-[10px] text-sb-ink/60 space-y-1 border-t border-sb-ink/8 pt-2">
                              {(voDetailById[vo._id].statusAudits as any[]).slice(0, 15).map((a: any) => (
                                <div key={a._id}>
                                  {a.changedAt ? new Date(a.changedAt).toLocaleString() : ""} — {a.status}
                                  {a.remarks ? ` · ${a.remarks}` : ""}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update Status */}
            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Update Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateStatus(selected._id, s)}
                    className={`py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors text-left break-words leading-snug ${
                      selected.status === s
                        ? "bg-sb-orange text-white border-sb-orange"
                        : "border-sb-ink/10 text-sb-ink/65 hover:border-sb-orange/40 hover:text-sb-orange"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned vendor — dropdown of approved vendors */}
            <div>
              <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-2">Assigned vendor</p>
              <p className="text-xs text-sb-ink/50 mb-2">Select an approved vendor, then click Assign.</p>
              {vendorsLoading ? (
                <div className="flex items-center gap-2 text-sm text-sb-ink/55 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-sb-orange" /> Loading vendors…
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={vendorPick}
                    onChange={(e) => setVendorPick(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-sb-ink/10 bg-sb-cream px-3 py-2 text-sm text-sb-ink focus:border-sb-orange focus:outline-none cursor-pointer"
                  >
                    <option value="">— Select vendor —</option>
                    {approvedVendors.map((v) => (
                      <option key={v._id} value={v._id}>
                        {(v.companyName || v.name || "Vendor").trim()}
                        {v.email ? ` · ${v.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      !vendorPick || vendorPick === vendorUserId(selected.assignedVendor)
                    }
                    onClick={() => {
                      if (!vendorPick) return;
                      void assignVendor(selected._id, vendorPick);
                    }}
                    className="shrink-0 px-4 py-2 rounded-lg text-sm font-bold bg-sb-orange text-white hover:bg-sb-orange-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {selected.assignedVendor ? "Update" : "Assign"}
                  </button>
                </div>
              )}
              {!vendorsLoading && approvedVendors.length === 0 && (
                <p className="text-xs text-sb-ink/45 mt-2">No approved vendors yet. Approve vendors under Vendors first.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
