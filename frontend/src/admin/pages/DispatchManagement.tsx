import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Truck,
  Eye,
  Loader2,
  RefreshCw,
  Package,
  User,
  ExternalLink,
  Save,
} from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const SHIPMENT_STATUSES = [
  "CREATED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
  "RETURNED",
  "CANCELLED",
] as const;

function labelForShipmentStatus(s: string) {
  const map: Record<string, string> = {
    CREATED: "Ready / created",
    PICKUP_SCHEDULED: "Pickup scheduled",
    PICKED_UP: "Picked up",
    IN_TRANSIT: "In transit",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    FAILED_DELIVERY: "Failed delivery",
    RETURNED: "Returned",
    CANCELLED: "Cancelled",
  };
  return map[s] || s;
}

function fmtEta(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(d);
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#1A1A1A]">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

type DispatchBoardData = {
  stats: {
    readyForDispatch: number;
    outForDelivery: number;
    deliveredToday: number;
    activeDrivers: number;
  };
  shipments: any[];
};

export function DispatchManagement() {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<DispatchBoardData | null>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, limit: 50 });
  const [listPage, setListPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await apiFetch<DispatchBoardData>(`/shipments/dispatch-board?page=${page}&limit=50`);
      const payload = res.data as DispatchBoardData | undefined;
      setBoard(
        payload || {
          stats: { readyForDispatch: 0, outForDelivery: 0, deliveredToday: 0, activeDrivers: 0 },
          shipments: [],
        }
      );
      const pg = (res.pagination as { total?: number; pages?: number; page?: number; limit?: number }) || {};
      setPagination({
        total: pg.total ?? 0,
        pages: pg.pages ?? 1,
        page: pg.page ?? page,
        limit: pg.limit ?? 50,
      });
    } catch {
      setBoard({
        stats: { readyForDispatch: 0, outForDelivery: 0, deliveredToday: 0, activeDrivers: 0 },
        shipments: [],
      });
      setPagination({ total: 0, pages: 1, page: 1, limit: 50 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(listPage);
  }, [listPage, load]);

  const openDetail = (s: any) => {
    setSelected(s);
    setStatusDraft(s.status || "CREATED");
    setStatusNote("");
  };

  const saveStatus = async () => {
    if (!selected?._id || !statusDraft) return;
    setSaving(true);
    try {
      await apiFetch(`/shipments/${selected._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusDraft, description: statusNote || undefined }),
      });
      setSelected(null);
      await load(listPage);
    } catch (e: any) {
      alert(e.message || "Could not update shipment");
    }
    setSaving(false);
  };

  const stats = board?.stats;
  const shipments = board?.shipments || [];

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Dispatch Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">Live shipments from logistics — update status as deliveries progress.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(listPage)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-[#1A1A1A] text-sm text-[#D4C4A8] hover:text-[#F4E9D8] hover:border-[#FE5E00]/40 transition-colors self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "Ready for dispatch", value: stats?.readyForDispatch ?? 0, hint: "Master orders at READY_FOR_DISPATCH", color: "text-[#F4E9D8]" },
          { label: "Out for delivery", value: stats?.outForDelivery ?? 0, hint: "Active in-transit shipments", color: "text-blue-400" },
          { label: "Delivered today", value: stats?.deliveredToday ?? 0, hint: "Completed since midnight", color: "text-green-400" },
          { label: "Active drivers", value: stats?.activeDrivers ?? 0, hint: "Named drivers on active runs", color: "text-[#FE5E00]" },
        ].map((c) => (
          <div key={c.label} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-[#D4C4A8]/50 uppercase tracking-wide font-semibold">{c.label}</p>
            <p className={`text-3xl font-black mt-1 tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-[#D4C4A8]/35 mt-2 leading-relaxed">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#FE5E00]" />
            <h2 className="font-bold text-[#F4E9D8] text-sm">Shipments</h2>
          </div>
          <span className="text-xs text-[#D4C4A8]/50">
            {pagination.total
              ? `${(pagination.page - 1) * (pagination.limit || 50) + 1}–${Math.min(
                  pagination.page * (pagination.limit || 50),
                  pagination.total
                )} of ${pagination.total}`
              : "0 total"}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-[#D4C4A8]/50">
                  <th className="py-3 px-4">Shipment</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Driver / vehicle</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">ETA</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => {
                  const order = s.masterOrder;
                  const orderNo = order?.orderNumber || "—";
                  const cust = order?.customer?.name || "—";
                  return (
                    <tr key={s._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-[#F4E9D8]">{s.shipmentNumber || s._id}</td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/orders?search=${encodeURIComponent(orderNo)}`}
                          className="font-mono text-[#FE5E00] hover:underline inline-flex items-center gap-1"
                        >
                          {orderNo}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[#D4C4A8]/80">{cust}</td>
                      <td className="py-3 px-4 text-[#D4C4A8]/70 text-xs">
                        <div>{s.driverName || "—"}</div>
                        <div className="font-mono text-[#D4C4A8]/50">{s.vehicleNumber || "—"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs border-white/15 bg-white/5 text-[#F4E9D8]">
                          <Package className="h-3 w-3 text-[#FE5E00]" />
                          {labelForShipmentStatus(s.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#D4C4A8]/70 text-xs whitespace-nowrap">{fmtEta(s.estimatedDelivery)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(s)}
                          className="p-1.5 border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] hover:border-white/20 transition-colors inline-flex"
                          title="View & update"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shipments.length === 0 && (
              <div className="py-16 text-center text-[#D4C4A8]/45 text-sm">
                <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                No shipments yet. Create shipments from vendor orders / logistics workflow when orders are ready to leave the warehouse.
              </div>
            )}
          </div>
        )}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center flex-wrap gap-2 px-4 py-3 border-t border-white/8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setListPage(p)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                  p === listPage
                    ? "bg-[#FE5E00] text-black"
                    : "bg-[#0D0D0D] border border-white/10 text-[#D4C4A8] hover:border-[#FE5E00]/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title={`Shipment ${selected.shipmentNumber || ""}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                <p className="text-[10px] text-[#D4C4A8]/50 uppercase mb-0.5">Order</p>
                <p className="font-mono text-[#F4E9D8]">{selected.masterOrder?.orderNumber || "—"}</p>
              </div>
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                <p className="text-[10px] text-[#D4C4A8]/50 uppercase mb-0.5">Customer</p>
                <p className="text-[#F4E9D8] flex items-center gap-1">
                  <User className="h-3.5 w-3.5 shrink-0 text-[#D4C4A8]/40" />
                  {selected.masterOrder?.customer?.name || "—"}
                </p>
              </div>
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg col-span-2">
                <p className="text-[10px] text-[#D4C4A8]/50 uppercase mb-0.5">Logistics</p>
                <p className="text-[#D4C4A8]/80">
                  {selected.logisticsPartner}
                  {selected.customPartnerName ? ` · ${selected.customPartnerName}` : ""}
                </p>
              </div>
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                <p className="text-[10px] text-[#D4C4A8]/50 uppercase mb-0.5">Driver</p>
                <p className="text-[#F4E9D8]">{selected.driverName || "—"}</p>
                <p className="text-xs text-[#D4C4A8]/50">{selected.driverPhone || ""}</p>
              </div>
              <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
                <p className="text-[10px] text-[#D4C4A8]/50 uppercase mb-0.5">Vehicle</p>
                <p className="font-mono text-[#F4E9D8]">{selected.vehicleNumber || "—"}</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Update status</label>
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="w-full bg-[#0D0D0D] border border-white/15 rounded-lg px-3 py-2 text-[#F4E9D8] text-sm"
              >
                {SHIPMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {labelForShipmentStatus(st)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1 block">Note (optional)</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={2}
                placeholder="e.g. Customer requested evening slot"
                className="w-full bg-[#0D0D0D] border border-white/15 rounded-lg px-3 py-2 text-[#F4E9D8] text-sm placeholder:text-[#D4C4A8]/30"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void saveStatus()}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#FE5E00] text-[#0D0D0D] font-bold text-sm hover:bg-[#E05200] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save status
              </button>
              <Link
                to={`/orders?search=${encodeURIComponent(selected.masterOrder?.orderNumber || "")}`}
                className="px-4 py-2.5 rounded-lg border border-white/15 text-[#D4C4A8] text-sm hover:border-[#FE5E00]/40 hover:text-[#F4E9D8] inline-flex items-center"
              >
                Open order
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
