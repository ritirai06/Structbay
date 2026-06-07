import { useState, useEffect, useCallback } from "react";
import { Plus, Warehouse, AlertCircle, Loader2, RefreshCw, Search, History, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";

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

const DEMO_INV = [
  { _id: "1", product: { name: "Cement PPC 53 Grade", sku: "CEM-PPC-53" }, city: { name: "Bengaluru" }, quantity: 450, reserved: 80, lowStockThreshold: 50 },
  { _id: "2", product: { name: "TMT Steel Bars 16mm", sku: "STL-TMT-16" }, city: { name: "Bengaluru" }, quantity: 40, reserved: 20, lowStockThreshold: 50 },
  { _id: "3", product: { name: "Ready Mix Concrete M30", sku: "RMC-M30" }, city: { name: "Hyderabad" }, quantity: 0, reserved: 0, lowStockThreshold: 10 },
  { _id: "4", product: { name: "Red Clay Bricks", sku: "BRK-RCL" }, city: { name: "Chennai" }, quantity: 5000, reserved: 1200, lowStockThreshold: 200 },
  { _id: "5", product: { name: "Cement OPC 43 Grade", sku: "CEM-OPC-43" }, city: { name: "Bengaluru" }, quantity: 30, reserved: 0, lowStockThreshold: 50 },
];

type AdjustType = "ADD" | "DEDUCT" | "ADJUST";

const inp = "w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-[#F4E9D8]">{title}</h3>
          <button onClick={onClose} className="text-[#D4C4A8]/60 hover:text-[#F4E9D8] text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function InventoryManagement() {
  const [items, setItems] = useState<any[]>(DEMO_INV);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [showLow, setShowLow] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const [tab, setTab] = useState<"inventory" | "logs">("inventory");
  const [modal, setModal] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [adjType, setAdjType] = useState<AdjustType>("ADD");
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0 });
  const [logs, setLogs] = useState<any[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/inventory?limit=50`)
      .then(d => setItems(d.data || []))
      .catch(() => setItems(DEMO_INV))
      .finally(() => setLoading(false));
    apiFetch("/inventory/stats")
      .then(d => setStats(d.data))
      .catch(() => setStats({ total: DEMO_INV.length, lowStock: 2, outOfStock: 1 }));
  }, []);

  const loadLogs = useCallback(() => {
    apiFetch("/inventory/logs?limit=30")
      .then(d => setLogs(d.data || []))
      .catch(() => setLogs([]));
  }, []);

  useEffect(() => { load(); loadLogs(); }, [load, loadLogs]);

  const adjust = async () => {
    if (!modal.item || adjQty <= 0) return alert("Enter a valid quantity.");
    setSaving(true);
    try {
      await apiFetch("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          product: modal.item.product?._id || modal.item.product,
          city: modal.item.city?._id || modal.item.city,
          type: adjType, quantity: adjQty, reason: adjReason,
        }),
      });
      setModal({ open: false, item: null });
      load(); loadLogs();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const openAdjust = (item: any, type: AdjustType) => {
    setModal({ open: true, item });
    setAdjType(type);
    setAdjQty(0);
    setAdjReason("");
  };

  const available = (item: any) => Math.max(0, item.quantity - item.reserved);
  const isLow = (item: any) => item.quantity > 0 && item.quantity <= item.lowStockThreshold;
  const isOut = (item: any) => item.quantity === 0;

  const filtered = items.filter(item => {
    if (search && !item.product?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && item.city?.name !== filterCity) return false;
    if (showLow && !isLow(item)) return false;
    if (showOut && !isOut(item)) return false;
    return true;
  });

  const cities = [...new Set(items.map(i => i.city?.name).filter(Boolean))];

  return (
    <div className="p-6 bg-[#0D0D0D] min-h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F4E9D8]">Inventory Management</h1>
          <p className="text-[#D4C4A8]/60 text-sm mt-1">City-wise stock tracking with full audit logs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-[#F4E9D8]">{stats.total || DEMO_INV.length}</div>
          <div className="text-xs text-[#D4C4A8]/50 mt-1">Total SKUs</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#FE5E00]/20 rounded-xl p-4 text-center cursor-pointer hover:border-[#FE5E00]/40 transition-colors" onClick={() => { setShowLow(!showLow); setShowOut(false); }}>
          <div className="text-3xl font-black text-[#FE5E00]">{stats.lowStock || 2}</div>
          <div className="text-xs text-[#D4C4A8]/50 mt-1">Low Stock {showLow && "▼"}</div>
        </div>
        <div className="bg-[#1A1A1A] border border-red-400/20 rounded-xl p-4 text-center cursor-pointer hover:border-red-400/40 transition-colors" onClick={() => { setShowOut(!showOut); setShowLow(false); }}>
          <div className="text-3xl font-black text-red-400">{stats.outOfStock || 1}</div>
          <div className="text-xs text-[#D4C4A8]/50 mt-1">Out of Stock {showOut && "▼"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#1A1A1A] border border-white/10 rounded-lg p-1 w-fit">
        {[{ key: "inventory", label: "Inventory" }, { key: "logs", label: "Audit Logs" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-[#FE5E00] text-[#0D0D0D]" : "text-[#D4C4A8]/60 hover:text-[#F4E9D8]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4C4A8]/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] placeholder:text-[#D4C4A8]/30 focus:outline-none focus:border-[#FE5E00] transition-colors" />
            </div>
            <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
              className="bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F4E9D8] px-3 py-2 focus:outline-none focus:border-[#FE5E00] transition-colors">
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={load} className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#D4C4A8]/60 hover:text-[#F4E9D8] transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#FE5E00]" /></div>
          ) : (
            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {["Product", "City", "Total Stock", "Reserved", "Available", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const avail = available(item);
                    const low = isLow(item);
                    const out = isOut(item);
                    return (
                      <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#F4E9D8]">{item.product?.name}</p>
                          <p className="text-xs font-mono text-[#D4C4A8]/50">{item.product?.sku}</p>
                        </td>
                        <td className="py-3.5 px-4 text-[#D4C4A8]/70">{item.city?.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#F4E9D8]">{item.quantity.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-[#D4C4A8]/60">{item.reserved}</td>
                        <td className="py-3.5 px-4">
                          <span className={`font-bold ${out ? "text-red-400" : low ? "text-[#FE5E00]" : "text-green-400"}`}>
                            {avail.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {out ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                              <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                            </span>
                          ) : low ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-[#FE5E00]">
                              <AlertCircle className="w-3.5 h-3.5" /> Low Stock
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-green-400">In Stock</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => openAdjust(item, "ADD")} title="Add Stock"
                              className="p-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors">
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openAdjust(item, "DEDUCT")} title="Deduct Stock"
                              className="p-1.5 bg-red-500/10 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
                              <TrendingDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openAdjust(item, "ADJUST")} title="Set Stock"
                              className="p-1.5 bg-[#FE5E00]/10 border border-[#FE5E00]/20 rounded-lg text-[#FE5E00] hover:bg-[#FE5E00]/20 transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <Warehouse className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
                  <p className="text-[#D4C4A8]/40">No inventory records.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "logs" && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <h3 className="font-semibold text-[#F4E9D8] text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-[#FE5E00]" /> Inventory Audit Logs
            </h3>
          </div>
          {logs.length === 0 ? (
            <div className="py-16 text-center text-[#D4C4A8]/40">
              <History className="w-10 h-10 mx-auto mb-3 text-[#D4C4A8]/20" />
              No inventory logs yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {["Product", "City", "Type", "Qty", "Before", "After", "Reason", "By", "Date"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#D4C4A8]/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-[#F4E9D8] font-medium">{log.product?.name}</td>
                      <td className="py-3 px-4 text-[#D4C4A8]/70">{log.city?.name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          log.type === "ADD" ? "bg-green-500/15 text-green-400" :
                          log.type === "DEDUCT" ? "bg-red-500/15 text-red-400" :
                          "bg-[#FE5E00]/15 text-[#FE5E00]"
                        }`}>{log.type}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F4E9D8]">{log.quantity}</td>
                      <td className="py-3 px-4 text-[#D4C4A8]/60">{log.quantityBefore}</td>
                      <td className="py-3 px-4 text-[#F4E9D8]">{log.quantityAfter}</td>
                      <td className="py-3 px-4 text-[#D4C4A8]/60 max-w-xs truncate">{log.reason || "—"}</td>
                      <td className="py-3 px-4 text-[#D4C4A8]/60">{log.performedBy?.name}</td>
                      <td className="py-3 px-4 text-[#D4C4A8]/50 text-xs">{new Date(log.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal.open && (
        <Modal
          title={`${adjType === "ADD" ? "Add" : adjType === "DEDUCT" ? "Deduct" : "Set"} Stock — ${modal.item?.product?.name}`}
          onClose={() => setModal({ open: false, item: null })}>
          <div className="space-y-4">
            <div className="p-3 bg-[#0D0D0D] border border-white/8 rounded-lg">
              <p className="text-xs text-[#D4C4A8]/60">City: <span className="text-[#F4E9D8]">{modal.item?.city?.name}</span></p>
              <p className="text-xs text-[#D4C4A8]/60 mt-1">Current Stock: <span className="font-bold text-[#F4E9D8]">{modal.item?.quantity}</span></p>
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1.5 block">
                {adjType === "ADJUST" ? "Set stock to" : "Quantity to " + adjType.toLowerCase()} *
              </label>
              <input type="number" className={inp} min={0} value={adjQty}
                onChange={e => setAdjQty(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#D4C4A8]/60 mb-1.5 block">Reason</label>
              <input className={inp} value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="e.g. Restocking, damage, return..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={adjust} disabled={saving}
                className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg text-sm flex-1 justify-center text-white disabled:opacity-60 transition-colors ${
                  adjType === "ADD" ? "bg-green-600 hover:bg-green-700" :
                  adjType === "DEDUCT" ? "bg-red-600 hover:bg-red-700" :
                  "bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D]"
                }`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {adjType} Stock
              </button>
              <button onClick={() => setModal({ open: false, item: null })}
                className="px-4 py-2 border border-white/15 rounded-lg text-sm text-[#D4C4A8] hover:border-white/30 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
