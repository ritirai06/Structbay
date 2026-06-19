import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search, RefreshCw, Eye, UserPlus, Loader2 } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { adminPath } from "../../lib/portalRoutes";
import { formatPaymentMethod, formatPaymentStatus } from "../../lib/paymentLabels";
import { DeliveryWorkflowGuide } from "../components/DeliveryWorkflowGuide";
import { ORDER_STATUS_COLORS, PAY_COLORS } from "../components/order/orderDetailShared";
import { useAdminListDelete } from "../hooks/useAdminListDelete";
import {
  AdminListDeleteControls,
  AdminRowDeleteButton,
  AdminTableSelectCell,
  AdminTableSelectHeader,
} from "../components/AdminListDeleteControls";

const ALL_STATUSES = [
  "PENDING", "PAID", "VENDOR_ASSIGNMENT_PENDING", "PROCESSING", "READY_FOR_DISPATCH",
  "PARTIALLY_DISPATCHED", "DISPATCHED", "PARTIALLY_DELIVERED", "DELIVERED", "COMPLETED",
  "CANCELLED", "RETURNED",
];

/** Orders in active logistics cannot be soft-deleted (matches backend). */
const NON_DELETABLE_ORDER_STATUSES = new Set([
  "READY_FOR_DISPATCH",
  "PARTIALLY_DISPATCHED",
  "DISPATCHED",
  "PARTIALLY_DELIVERED",
]);

function orderCanSoftDelete(status: string) {
  return !NON_DELETABLE_ORDER_STATUSES.has(status);
}

export function OrderManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, dispatched: 0, delivered: 0, cancelled: 0 });
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [loadError, setLoadError] = useState<string | null>(null);

  const openOrderDetail = (order: { _id: string }, hash?: string) => {
    navigate(`${adminPath("orders", order._id)}${hash ? `#${hash}` : ""}`);
  };

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(decodeURIComponent(q));
  }, [searchParams]);

  const loadStats = useCallback(() => {
    return apiFetch("/orders/stats")
      .then((d) => {
        if (d.data && typeof d.data === "object") setStats(d.data as typeof stats);
      })
      .catch(() => {
        /* keep prior stats */
      });
  }, []);

  const applyDeletedOrdersToStats = useCallback((deletedOrders: { status?: string }[]) => {
    if (!deletedOrders.length) return;
    setStats((prev) => {
      const next = { ...prev };
      for (const order of deletedOrders) {
        next.total = Math.max(0, (next.total ?? 0) - 1);
        const status = String(order.status || "");
        if (["PENDING", "PAID", "VENDOR_ASSIGNMENT_PENDING"].includes(status)) {
          next.pending = Math.max(0, (next.pending ?? 0) - 1);
        }
        if (["PROCESSING", "READY_FOR_DISPATCH", "PARTIALLY_DISPATCHED"].includes(status)) {
          next.processing = Math.max(0, (next.processing ?? 0) - 1);
        }
        if (["DISPATCHED", "PARTIALLY_DELIVERED"].includes(status)) {
          next.dispatched = Math.max(0, (next.dispatched ?? 0) - 1);
        }
        if (["DELIVERED", "COMPLETED"].includes(status)) {
          next.delivered = Math.max(0, (next.delivered ?? 0) - 1);
        }
        if (status === "CANCELLED") {
          next.cancelled = Math.max(0, (next.cancelled ?? 0) - 1);
        }
      }
      return next;
    });
  }, []);

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

    void Promise.all([listP, loadStats()]).finally(() => setLoading(false));
  }, [search, statusFilter, loadStats]);

  useEffect(() => { load(); }, [load]);

  const visibleIds = useMemo(() => orders.map((o) => String(o._id)), [orders]);
  const deleteHook = useAdminListDelete({
    singleDeleteUrl: (id) => `/orders/${id}`,
    bulkDeleteUrl: "/orders/bulk-delete",
    onSuccess: (deletedIds) => {
      const removed = orders.filter((o) => deletedIds.includes(String(o._id)));
      applyDeletedOrdersToStats(removed);
      void loadStats();
      load(pagination.page || 1);
    },
    itemLabel: "orders",
  });

  return (
    <div className="admin-page">
      <div className="mb-6">
        <h1 className="admin-page-title text-sb-ink">Order Management</h1>
        <p className="admin-page-desc">Central order processing, vendor assignment & status tracking</p>
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

      <AdminListDeleteControls
        deleteHook={deleteHook}
        visibleIds={visibleIds}
        disabled={loading}
        itemLabel="orders"
      />

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
                  <AdminTableSelectHeader
                    checked={deleteHook.allVisibleSelected(visibleIds)}
                    onChange={() => deleteHook.toggleAllVisible(visibleIds)}
                  />
                  {["Order ID", "Customer", "City", "Items", "Total", "Vendor", "Payment", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const rowId = String(order._id);
                  return (
                  <tr key={order._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                    <AdminTableSelectCell
                      checked={deleteHook.isSelected(rowId)}
                      onChange={() => deleteHook.toggleRow(rowId)}
                      ariaLabel={`Select order ${order.orderNumber}`}
                    />
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
                        : <button onClick={() => openOrderDetail(order, "step-vendor")}
                            className="flex items-center gap-1.5 text-xs bg-sb-orange/10 text-sb-orange border border-sb-orange/20 px-2.5 py-1 rounded-lg hover:bg-sb-orange/20 transition-colors">
                            <UserPlus className="w-3 h-3" /> Assign
                          </button>
                      }
                    </td>
                    <td className="py-3.5 px-4">
                      <p className={`text-xs font-bold ${PAY_COLORS[order.paymentStatus] || "text-sb-ink/55"}`}>
                        {formatPaymentStatus(order.paymentStatus)}
                      </p>
                      <p className="text-[10px] text-sb-ink/45 mt-0.5">{formatPaymentMethod(order.paymentMethod)}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ORDER_STATUS_COLORS[order.status] || "bg-sb-cream-secondary text-sb-ink/55 border-sb-ink/12"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-sb-ink/50">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => openOrderDetail(order)}
                          className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink hover:border-sb-ink/20 transition-colors"
                          title="Open order workflow"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <AdminRowDeleteButton
                          onClick={() =>
                            deleteHook.requestDelete([rowId], `order ${order.orderNumber}`)
                          }
                          disabled={deleteHook.busy || !orderCanSoftDelete(order.status)}
                          title={
                            orderCanSoftDelete(order.status)
                              ? "Delete"
                              : "Cannot delete while order is in dispatch or delivery"
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );})}
                {!orders.length && (
                  <tr>
                    <td colSpan={11} className="py-14 px-4 text-center text-sm text-sb-ink/55 leading-relaxed max-w-xl mx-auto">
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
    </div>
  );
}
