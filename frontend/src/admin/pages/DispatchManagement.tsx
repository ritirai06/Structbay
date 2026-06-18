import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { Truck, Eye, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { useAdminListDelete } from "../hooks/useAdminListDelete";
import {
  AdminListDeleteControls,
  AdminRowDeleteButton,
  AdminTableSelectCell,
  AdminTableSelectHeader,
} from "../components/AdminListDeleteControls";

type DispatchedBoard = {
  stats: { dispatched: number; delivered: number };
  dispatches: any[];
};

function fmtDispatchDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(d);
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 sticky top-0 bg-sb-cream-secondary">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function DispatchManagement() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [board, setBoard] = useState<DispatchedBoard | null>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, limit: 50 });
  const [listPage, setListPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch<DispatchedBoard>(`/admin/dispatch/vendor-board?page=${page}&limit=50`);
      const payload = res.data as DispatchedBoard | undefined;
      setBoard(
        payload || {
          stats: { dispatched: 0, delivered: 0 },
          dispatches: [],
        }
      );
      const pg = (res.pagination as { total?: number; pages?: number; page?: number; limit?: number }) || {};
      setPagination({
        total: pg.total ?? 0,
        pages: pg.pages ?? 1,
        page: pg.page ?? page,
        limit: pg.limit ?? 50,
      });
    } catch (e) {
      setBoard({ stats: { dispatched: 0, delivered: 0 }, dispatches: [] });
      setPagination({ total: 0, pages: 1, page: 1, limit: 50 });
      setLoadError(e instanceof Error ? e.message : "Failed to load dispatched orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(listPage);
  }, [listPage, load]);

  const dispatches = board?.dispatches || [];
  const stats = board?.stats;
  const visibleIds = useMemo(
    () => dispatches.map((d) => String(d._id)).filter(Boolean),
    [dispatches]
  );
  const deleteHook = useAdminListDelete({
    singleDeleteUrl: (id) => `/admin/vendor-orders/${id}`,
    bulkDeleteUrl: "/admin/vendor-orders/bulk-delete",
    onSuccess: () => void load(listPage),
    itemLabel: "dispatch records",
  });

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-sb-ink">Dispatch Management</h1>
          <p className="admin-page-desc">
            Vendor sub-orders marked dispatched — transporter, LR, vehicle and proof.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(listPage)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sb-ink/10 bg-sb-cream-secondary text-sm text-sb-ink/60 hover:text-sb-ink hover:border-sb-orange/40 transition-colors self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-6 max-w-md">
        {[
          { label: "Dispatched", value: stats?.dispatched ?? 0 },
          { label: "Delivered", value: stats?.delivered ?? 0 },
        ].map((c) => (
          <div key={c.label} className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
            <p className="text-xs text-sb-ink/50 uppercase tracking-wide font-semibold">{c.label}</p>
            <p className="admin-stat-value mt-1 tabular-nums text-sb-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <AdminListDeleteControls
        deleteHook={deleteHook}
        visibleIds={visibleIds}
        disabled={loading}
        itemLabel="records"
      />

      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-sb-ink/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-sb-orange" />
            <h2 className="font-bold text-sb-ink text-sm">Dispatched orders</h2>
          </div>
          <span className="text-xs text-sb-ink/50">{pagination.total} total</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-sb-ink/10 text-left text-xs uppercase tracking-wider text-sb-ink/50">
                  <AdminTableSelectHeader
                    checked={deleteHook.allVisibleSelected(visibleIds)}
                    onChange={() => deleteHook.toggleAllVisible(visibleIds)}
                  />
                  <th className="py-3 px-4">Sub-order</th>
                  <th className="py-3 px-4">Master order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Transporter</th>
                  <th className="py-3 px-4">LR / vehicle</th>
                  <th className="py-3 px-4">Dispatch date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => {
                  const t = d.transport || {};
                  const rowId = String(d._id);
                  const vendorName =
                    d.vendor && typeof d.vendor === "object"
                      ? d.vendor.companyName || d.vendor.name
                      : "—";
                  return (
                    <tr key={d._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90">
                      <AdminTableSelectCell
                        checked={deleteHook.isSelected(rowId)}
                        onChange={() => deleteHook.toggleRow(rowId)}
                        ariaLabel={`Select dispatch ${d.orderNumber || rowId}`}
                      />
                      <td className="py-3 px-4 font-mono text-sb-orange">{d.orderNumber || "—"}</td>
                      <td className="py-3 px-4 font-mono text-xs text-sb-ink/65">{d.masterOrderNumber || "—"}</td>
                      <td className="py-3 px-4 text-sb-ink/70">{d.customerName || "—"}</td>
                      <td className="py-3 px-4 text-sb-ink/70 text-xs">{vendorName}</td>
                      <td className="py-3 px-4 text-sb-ink/70">{t.transporterName || "—"}</td>
                      <td className="py-3 px-4 text-xs text-sb-ink/65">
                        <div>{t.lrNumber || "—"}</div>
                        <div className="font-mono text-sb-ink/50">{t.vehicleNumber || "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">{fmtDispatchDate(t.dispatchDate)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex rounded-full border px-2 py-0.5 text-xs border-sb-ink/15 bg-white/5 text-sb-ink capitalize">
                          {String(d.vendorOrderStatus || d.status || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelected(d)}
                            className="p-1.5 border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink"
                            title="View transport details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <AdminRowDeleteButton
                            onClick={() =>
                              deleteHook.requestDelete(
                                [rowId],
                                `dispatch ${d.orderNumber || rowId}`
                              )
                            }
                            disabled={deleteHook.busy}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dispatches.length === 0 && (
              <div className="py-16 text-center text-sb-ink/45 text-sm">
                <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                No dispatched orders yet. They appear here when a vendor marks an order dispatched in the workflow.
              </div>
            )}
          </div>
        )}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center flex-wrap gap-2 px-4 py-3 border-t border-sb-ink/10">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setListPage(p)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium ${
                  p === listPage ? "bg-sb-orange text-black" : "bg-sb-cream border border-sb-ink/10 text-sb-ink/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title={`Dispatch · ${selected.orderNumber || ""}`} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            {[
              ["Transporter", selected.transport?.transporterName],
              ["LR / Docket", selected.transport?.lrNumber],
              ["Vehicle", selected.transport?.vehicleNumber],
              ["Tracking", selected.transport?.trackingNumber],
              ["Dispatch date", fmtDispatchDate(selected.transport?.dispatchDate)],
              ["Status", selected.vendorOrderStatus],
              ["Customer", selected.customerName],
              [
                "Vendor",
                selected.vendor && typeof selected.vendor === "object"
                  ? selected.vendor.companyName || selected.vendor.name
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
                <p className="text-[10px] text-sb-ink/50 uppercase mb-0.5">{label}</p>
                <p className="text-sb-ink">{value || "—"}</p>
              </div>
            ))}
            {selected.transport?.proofUrl && (
              <a
                href={selected.transport.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sb-orange font-semibold text-sm"
              >
                View dispatch proof
              </a>
            )}
            <Link
              to={`/orders?search=${encodeURIComponent(selected.masterOrderNumber || selected.orderNumber || "")}`}
              className="inline-flex items-center gap-1 text-sb-orange text-sm font-medium hover:underline"
            >
              Open order in Orders <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
