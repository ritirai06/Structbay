import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Plus, Warehouse, AlertCircle, Loader2, RefreshCw, Search, History, TrendingUp, TrendingDown, RotateCcw, Upload, Download, Trash2 } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import { AdminBulkToolbar } from "../components/AdminBulkToolbar";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";

type AdjustType = "ADD" | "DEDUCT" | "ADJUST";

type BulkImportResult = {
  batchId?: string;
  total?: number;
  succeeded: number;
  failed: number;
  errors: { row: number; message: string }[];
};

const inp = "w-full bg-sb-cream border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors";

/** Split one CSV line respecting quoted fields */
function splitCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ",") {
      res.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  res.push(cur.trim());
  return res;
}

function parseInventoryBulkCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const idx = (names: string[]) => {
    for (const n of names) {
      const j = header.indexOf(n.toLowerCase());
      if (j >= 0) return j;
    }
    return -1;
  };
  const iSku = idx(["sku", "product_sku"]);
  const iPid = idx(["productid", "product_id"]);
  const iCity = idx(["city", "city_name", "cityname"]);
  const iCid = idx(["cityid", "city_id"]);
  const iQty = idx(["quantity", "qty"]);
  const iType = idx(["type"]);
  const iReason = idx(["reason"]);
  if (iSku < 0 && iPid < 0) {
    throw new Error("CSV must include a column: sku (or product_id).");
  }
  if (iCity < 0 && iCid < 0) {
    throw new Error("CSV must include a column: city (or city_id).");
  }
  if (iQty < 0) {
    throw new Error("CSV must include a column: quantity.");
  }

  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = splitCsvLine(lines[r]);
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const row: Record<string, string> = {};
    const sku = get(iSku);
    const pid = get(iPid);
    const city = get(iCity);
    const cid = get(iCid);
    const qty = get(iQty);
    if (sku) row.sku = sku;
    if (pid) row.productId = pid;
    if (city) row.city = city;
    if (cid) row.cityId = cid;
    if (qty !== "") row.quantity = qty;
    const t = get(iType);
    if (t) row.type = t;
    const reason = get(iReason);
    if (reason) row.reason = reason;
    if (!row.sku && !row.productId) continue;
    if (!row.city && !row.cityId) continue;
    if (row.quantity === undefined || row.quantity === "") continue;
    out.push(row);
  }
  return out;
}

function Modal({
  title,
  onClose,
  children,
  wide,
  panelClassName,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Overrides default max-width when set */
  panelClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        className={`bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full ${panelClassName || (wide ? "max-w-lg" : "max-w-md")}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10">
          <h3 className="font-bold text-sb-ink">{title}</h3>
          <button onClick={onClose} className="text-sb-ink/55 hover:text-sb-ink text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function InventoryManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  /** City ObjectId — options come from `/cities`, not only from loaded inventory rows */
  const [filterCity, setFilterCity] = useState("");
  const [allCities, setAllCities] = useState<{ _id: string; name: string; state?: string }[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<{ _id: string; name: string; sku?: string }[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addProduct, setAddProduct] = useState("");
  const [addCity, setAddCity] = useState("");
  const [addQty, setAddQty] = useState<number>(0);
  const [addReason, setAddReason] = useState("");
  const [addSaving, setAddSaving] = useState(false);
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([]);
  const [bulkParseError, setBulkParseError] = useState<string | null>(null);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      apiFetch(`/inventory?limit=200`).then((d) => setItems(d.data || [])),
      apiFetch("/inventory/stats").then((d) => setStats(d.data || { total: 0, lowStock: 0, outOfStock: 0 })),
    ]).catch((e: Error) => {
      setItems([]);
      setStats({ total: 0, lowStock: 0, outOfStock: 0 });
      setLoadError(e.message || "Could not load inventory (check admin login and backend).");
    }).finally(() => setLoading(false));
  }, []);

  const loadLogs = useCallback(() => {
    apiFetch("/inventory/logs?limit=30")
      .then(d => setLogs(d.data || []))
      .catch(() => setLogs([]));
  }, []);

  useEffect(() => {
    load();
    loadLogs();
  }, [load, loadLogs]);

  useEffect(() => {
    apiFetch("/cities?limit=200&status=ACTIVE")
      .then((d) =>
        setAllCities(
          (d.data || []).map((c: { _id: string; name: string; state?: string }) => ({
            _id: c._id,
            name: c.name,
            state: c.state,
          }))
        )
      )
      .catch(() => setAllCities([]));
  }, []);

  const loadProductCatalog = useCallback(() => {
    apiFetch("/products?limit=300&status=ACTIVE")
      .then((d) =>
        setCatalogProducts(
          (d.data || []).map((p: { _id: string; name: string; sku?: string }) => ({
            _id: p._id,
            name: p.name,
            sku: p.sku,
          }))
        )
      )
      .catch(() => setCatalogProducts([]));
  }, []);

  useEffect(() => {
    loadProductCatalog();
  }, [loadProductCatalog]);

  const productIdFromUrl = searchParams.get("product");
  useEffect(() => {
    if (!productIdFromUrl) return;
    setAddProduct(productIdFromUrl);
    setAddModalOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("product");
        return next;
      },
      { replace: true }
    );
  }, [productIdFromUrl, setSearchParams]);

  const adjust = async () => {
    if (!modal.item) return;
    if (adjType === "ADJUST") {
      if (!Number.isFinite(adjQty) || adjQty < 0) {
        return alert("Enter a valid quantity (0 or more when setting stock).");
      }
    } else if (adjQty <= 0) {
      return alert("Enter a valid quantity greater than 0.");
    }
    setSaving(true);
    try {
      await apiFetch("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          product: modal.item.product?._id || modal.item.product,
          variation: modal.item.variation?._id || modal.item.variation || undefined,
          city: modal.item.city?._id || modal.item.city,
          type: adjType, quantity: adjQty, reason: adjReason,
        }),
      });
      setModal({ open: false, item: null });
      load(); loadLogs();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const submitAddStock = async () => {
    if (!addProduct || !addCity) return alert("Choose a product and a city.");
    if (addQty <= 0) return alert("Enter a quantity greater than 0.");
    setAddSaving(true);
    try {
      await apiFetch("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          product: addProduct,
          city: addCity,
          type: "ADD",
          quantity: addQty,
          reason: addReason.trim() || "Initial / manual stock entry",
        }),
      });
      setAddModalOpen(false);
      setAddProduct("");
      setAddCity("");
      setAddQty(0);
      setAddReason("");
      load();
      loadLogs();
    } catch (e: any) {
      alert(e.message);
    }
    setAddSaving(false);
  };

  const downloadBulkTemplate = () => {
    const sampleCity = allCities[0]?.name || "Mumbai";
    const sampleSku = catalogProducts.find((p) => p.sku)?.sku || "YOUR-SKU";
    const csv = `sku,city,quantity,type,reason\n${sampleSku},${sampleCity},10,ADD,Replace with your rows (max 500 per upload)\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "structbay-inventory-bulk-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onBulkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkResult(null);
    setBulkParseError(null);
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBulkFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const rows = parseInventoryBulkCsv(text);
        if (rows.length === 0) {
          setBulkParseError("No data rows found. Check the header (sku, city, quantity) and add at least one row.");
          setBulkRows([]);
        } else {
          setBulkRows(rows);
        }
      } catch (err) {
        setBulkParseError(err instanceof Error ? err.message : String(err));
        setBulkRows([]);
      }
    };
    reader.readAsText(f, "UTF-8");
  };

  const submitBulkImport = async () => {
    if (bulkRows.length === 0) return alert("Choose a CSV file with at least one valid row.");
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const env = await apiFetch<BulkImportResult>("/inventory/bulk-import", {
        method: "POST",
        body: JSON.stringify({ rows: bulkRows }),
      });
      const d = env.data;
      if (d && typeof d === "object" && "succeeded" in d) {
        setBulkResult(d as BulkImportResult);
      }
      load();
      loadLogs();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Bulk import failed");
    }
    setBulkSubmitting(false);
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

  const filtered = items.filter((item) => {
    if (search && !item.product?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    const cityId = item.city?._id || item.city;
    if (filterCity && String(cityId) !== filterCity) return false;
    if (showLow && !isLow(item)) return false;
    if (showOut && !isOut(item)) return false;
    return true;
  });

  const filteredIds = useMemo(() => filtered.map((item) => String(item._id)), [filtered]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const runConfirmedDelete = async () => {
    if (!pendingDelete?.ids.length) return;
    setDeleteBusy(true);
    try {
      const env = await apiFetch<{
        succeeded: number;
        failed: number;
        errors: { id: string; message: string }[];
      }>("/inventory/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: pendingDelete.ids }),
      });
      const d = env.data;
      const removed = new Set(pendingDelete.ids);
      setSelectedIds((prev) => prev.filter((id) => !removed.has(id)));
      setPendingDelete(null);
      load();
      loadLogs();
      if (d?.failed && d.failed > 0) {
        const detail = d.errors?.[0]?.message;
        alert(
          `Deleted ${d.succeeded ?? 0} row(s). ${d.failed} could not be removed.${detail ? `\n\n${detail}` : ""}`
        );
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  };

  const cityLabel = (item: any) => {
    if (item.city?.name) {
      const st = item.city.state;
      return st ? `${item.city.name}, ${st}` : item.city.name;
    }
    const id = item.city?._id || item.city;
    return id ? `City id: ${String(id).slice(0, 8)}…` : "—";
  };

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="admin-page-title text-sb-ink">Inventory Management</h1>
          <p className="admin-page-desc">City-wise stock tracking with full audit logs</p>
          {loadError && (
            <p className="text-sb-ink/70 text-xs mt-2">{loadError}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              loadProductCatalog();
              setBulkParseError(null);
              setBulkResult(null);
              setBulkRows([]);
              setBulkFileName(null);
              setBulkModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-sb-cream-secondary border border-sb-ink/15 hover:border-sb-orange/50 text-sb-ink font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Upload className="w-4 h-4 text-sb-orange" />
            Bulk upload
          </button>
          <button
            type="button"
            onClick={() => {
              loadProductCatalog();
              setAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add / initialize stock
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 text-center">
          <div className="admin-stat-value text-sb-ink">{stats.total ?? 0}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Total SKUs</div>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-orange/20 rounded-xl p-4 text-center cursor-pointer hover:border-sb-orange/40 transition-colors" onClick={() => { setShowLow(!showLow); setShowOut(false); }}>
          <div className="admin-stat-value text-sb-orange">{stats.lowStock ?? 0}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Low Stock {showLow && "▼"}</div>
        </div>
        <div className="bg-sb-cream-secondary border border-sb-ink/18 rounded-xl p-4 text-center cursor-pointer hover:border-sb-orange/30 transition-colors" onClick={() => { setShowOut(!showOut); setShowLow(false); }}>
          <div className="admin-stat-value text-sb-ink/55">{stats.outOfStock ?? 0}</div>
          <div className="text-xs text-sb-ink/50 mt-1">Out of Stock {showOut && "▼"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg p-1 w-fit">
        {[{ key: "inventory", label: "Inventory" }, { key: "logs", label: "Audit Logs" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-sb-orange text-white" : "text-sb-ink/55 hover:text-sb-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sb-ink/45" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange transition-colors" />
            </div>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sm text-sb-ink px-3 py-2 focus:outline-none focus:border-sb-orange transition-colors min-w-[10rem]"
            >
              <option value="">All cities</option>
              {[...allCities]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                    {c.state ? ` (${c.state})` : ""}
                  </option>
                ))}
            </select>
            <button onClick={load} className="p-2 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg text-sb-ink/55 hover:text-sb-ink transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <AdminBulkToolbar
            totalCount={filtered.length}
            selectedCount={selectedIds.length}
            allSelected={allFilteredSelected}
            onToggleAll={toggleSelectAllFiltered}
            onDeleteSelected={() =>
              setPendingDelete({
                ids: selectedIds,
                label: `${selectedIds.length} inventory row(s)`,
              })
            }
            onDeleteAll={() =>
              setPendingDelete({
                ids: filteredIds,
                label: `all ${filteredIds.length} visible inventory row(s)`,
              })
            }
            itemLabel="rows"
            disabled={deleteBusy || loading}
          />

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div>
          ) : (
            <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sb-ink/10">
                    <th className="w-10 py-3 px-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-sb-ink/25 accent-sb-orange"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Select all visible rows"
                      />
                    </th>
                    {["Product", "City", "Total Stock", "Reserved", "Available", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const avail = available(item);
                    const low = isLow(item);
                    const out = isOut(item);
                    const rowId = String(item._id);
                    return (
                      <tr key={item._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                        <td className="py-3.5 px-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-sb-ink/25 accent-sb-orange"
                            checked={selectedSet.has(rowId)}
                            onChange={() => toggleRow(rowId)}
                            aria-label={`Select ${item.product?.name || "inventory row"}`}
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-sb-ink">{item.product?.name}</p>
                          <p className="text-xs font-mono text-sb-ink/50">{item.product?.sku}</p>
                          {item.variation && (
                            <p className="text-xs text-sb-orange/90 mt-0.5">
                              {item.variation.sku
                                || (item.variation.attributes
                                  ? Object.values(item.variation.attributes).filter(Boolean).join(" · ")
                                  : "Variant")}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-sb-ink/65">{cityLabel(item)}</td>
                        <td className="py-3.5 px-4 font-semibold text-sb-ink">{item.quantity.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-sb-ink/55">{item.reserved}</td>
                        <td className="py-3.5 px-4">
                          <span className={`font-bold ${out ? "text-sb-ink/55" : low ? "text-sb-orange" : "text-sb-orange"}`}>
                            {avail.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {out ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-sb-ink/55">
                              <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                            </span>
                          ) : low ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-sb-orange">
                              <AlertCircle className="w-3.5 h-3.5" /> Low Stock
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-sb-orange">In Stock</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => openAdjust(item, "ADD")} title="Add Stock"
                              className="p-1.5 bg-sb-orange/10 border border-sb-orange/22 rounded-lg text-sb-orange hover:bg-sb-orange/15 transition-colors">
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openAdjust(item, "DEDUCT")} title="Deduct Stock"
                              className="p-1.5 bg-sb-cream-secondary border border-sb-ink/18 rounded-lg text-sb-ink/55 hover:bg-sb-cream-secondary transition-colors">
                              <TrendingDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openAdjust(item, "ADJUST")} title="Set Stock"
                              className="p-1.5 bg-sb-orange/10 border border-sb-orange/20 rounded-lg text-sb-orange hover:bg-sb-orange/20 transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete row"
                              onClick={() =>
                                setPendingDelete({
                                  ids: [rowId],
                                  label: `${item.product?.name || "inventory row"} (${cityLabel(item)})`,
                                })
                              }
                              className="p-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center px-4">
                  <Warehouse className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
                  <p className="text-sb-ink/50 font-medium">No inventory rows match this view.</p>
                  <p className="text-sb-ink/45 text-xs mt-2 max-w-lg mx-auto leading-relaxed">
                    Create the first row with <strong className="text-sb-ink/55">Add / initialize stock</strong> above
                    (product + city + quantity). After that, use the row actions to add, deduct, or set levels.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "logs" && (
        <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-sb-ink/10">
            <h3 className="font-semibold text-sb-ink text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-sb-orange" /> Inventory Audit Logs
            </h3>
          </div>
          {logs.length === 0 ? (
            <div className="py-16 text-center text-sb-ink/45">
              <History className="w-10 h-10 mx-auto mb-3 text-sb-ink/20" />
              No inventory logs yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sb-ink/10">
                    {["Product", "City", "Type", "Qty", "Before", "After", "Reason", "By", "Date"].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-sb-ink/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log._id} className="border-b border-sb-ink/8 hover:bg-sb-cream-secondary/90 transition-colors">
                      <td className="py-3 px-4 text-sb-ink font-medium">{log.product?.name}</td>
                      <td className="py-3 px-4 text-sb-ink/65">{log.city?.name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          log.type === "ADD" ? "bg-sb-orange/12 text-sb-orange" :
                          log.type === "DEDUCT" ? "bg-sb-cream-secondary text-sb-ink/55" :
                          "bg-sb-orange/15 text-sb-orange"
                        }`}>{log.type}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-sb-ink">{log.quantity}</td>
                      <td className="py-3 px-4 text-sb-ink/55">{log.quantityBefore}</td>
                      <td className="py-3 px-4 text-sb-ink">{log.quantityAfter}</td>
                      <td className="py-3 px-4 text-sb-ink/55 max-w-xs truncate">{log.reason || "—"}</td>
                      <td className="py-3 px-4 text-sb-ink/55">{log.performedBy?.name}</td>
                      <td className="py-3 px-4 text-sb-ink/50 text-xs">{new Date(log.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {bulkModalOpen && (
        <Modal
          title="Bulk inventory upload (CSV)"
          panelClassName="max-w-3xl"
          onClose={() => {
            setBulkModalOpen(false);
            setBulkParseError(null);
            setBulkResult(null);
            setBulkRows([]);
            setBulkFileName(null);
          }}
        >
          <p className="text-xs text-sb-ink/50 mb-4 leading-relaxed">
            Upload a CSV with columns <strong className="text-sb-ink/80">sku</strong>,{" "}
            <strong className="text-sb-ink/80">city</strong>, <strong className="text-sb-ink/80">quantity</strong>
            , and optional <strong className="text-sb-ink/80">type</strong> (ADD, DEDUCT, ADJUST — default ADD) and{" "}
            <strong className="text-sb-ink/80">reason</strong>. You may use <code className="text-sb-orange/90">product_id</code>{" "}
            and/or <code className="text-sb-orange/90">city_id</code> instead of sku/city name. City names must match the admin
            city list (case-insensitive). Up to 500 rows per request.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => downloadBulkTemplate()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-sb-cream border border-sb-ink/12 text-sb-ink hover:border-sb-orange/40 transition-colors"
            >
              <Download className="w-4 h-4 text-sb-orange" />
              Download template
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-sb-orange hover:bg-sb-orange-hover text-white cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onBulkFile} />
            </label>
            {bulkFileName && (
              <span className="text-xs text-sb-ink/55 self-center">
                File: <span className="text-sb-ink/90 font-mono">{bulkFileName}</span>
              </span>
            )}
          </div>
          {bulkParseError && (
            <div className="mb-3 text-sm text-sb-ink bg-sb-cream-secondary border border-sb-ink/15 rounded-lg px-3 py-2">
              {bulkParseError}
            </div>
          )}
          {bulkResult && (
            <div
              className={`mb-3 text-sm rounded-lg px-3 py-2 border ${
                bulkResult.failed > 0
                  ? "text-sb-ink/80 bg-sb-orange/10 border-sb-orange/25"
                  : "text-sb-ink/80 bg-sb-orange/10 border-sb-orange/22"
              }`}
            >
              Processed {bulkResult.total ?? bulkRows.length} row(s):{" "}
              <strong>{bulkResult.succeeded}</strong> succeeded, <strong>{bulkResult.failed}</strong> failed.
              {bulkResult.errors?.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs font-mono space-y-1">
                  {bulkResult.errors.slice(0, 50).map((er, ix) => (
                    <li key={`${er.row}-${ix}`}>
                      Row {er.row}: {er.message}
                    </li>
                  ))}
                  {bulkResult.errors.length > 50 && <li>…and {bulkResult.errors.length - 50} more</li>}
                </ul>
              )}
            </div>
          )}
          {bulkRows.length > 0 && (
            <div className="mb-4 max-h-56 overflow-auto rounded-lg border border-sb-ink/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-gray-500">
                  <tr>
                    {["sku / product_id", "city / city_id", "qty", "type", "reason"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-sb-ink/50 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.slice(0, 25).map((row, i) => (
                    <tr key={i} className="border-b border-sb-ink/8">
                      <td className="py-1.5 px-2 font-mono text-sb-ink/90">{row.sku || row.productId || "—"}</td>
                      <td className="py-1.5 px-2 text-sb-ink/70">{row.city || row.cityId || "—"}</td>
                      <td className="py-1.5 px-2">{row.quantity}</td>
                      <td className="py-1.5 px-2">{row.type || "ADD"}</td>
                      <td className="py-1.5 px-2 text-sb-ink/55 truncate max-w-[8rem]">{row.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bulkRows.length > 25 && (
                <p className="text-sb-ink/45 text-xs px-2 py-2 border-t border-sb-ink/8">
                  Showing first 25 of {bulkRows.length} rows.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={bulkSubmitting || bulkRows.length === 0}
              onClick={() => void submitBulkImport()}
              className="flex-1 flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {bulkRows.length > 0 ? `(${bulkRows.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkModalOpen(false);
                setBulkParseError(null);
                setBulkResult(null);
                setBulkRows([]);
                setBulkFileName(null);
              }}
              className="px-4 py-2.5 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {addModalOpen && (
        <Modal
          wide
          title="Add or initialize stock"
          onClose={() => {
            setAddModalOpen(false);
            setAddReason("");
          }}
        >
          <p className="text-xs text-sb-ink/50 mb-4 leading-relaxed">
            Creates one inventory row per <strong className="text-sb-ink/80">product + city</strong> if it does not exist,
            then adds the quantity you enter (same as API <code className="text-sb-orange/90">POST /inventory/adjust</code>{" "}
            with type <code className="text-sb-orange/90">ADD</code>).
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-sb-ink/55 mb-1.5 block font-medium">Product *</label>
              <select
                className={`${inp} cursor-pointer`}
                value={addProduct}
                onChange={(e) => setAddProduct(e.target.value)}
              >
                <option value="">Select product</option>
                {[...catalogProducts]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                      {p.sku ? ` (${p.sku})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1.5 block font-medium">City *</label>
              <select
                className={`${inp} cursor-pointer`}
                value={addCity}
                onChange={(e) => setAddCity(e.target.value)}
              >
                <option value="">Select city</option>
                {[...allCities]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.state ? ` (${c.state})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1.5 block font-medium">Quantity to add *</label>
              <input
                type="number"
                className={inp}
                min={1}
                value={addQty || ""}
                onChange={(e) => setAddQty(e.target.value === "" ? 0 : +e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1.5 block">Reason (optional)</label>
              <input
                className={inp}
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="e.g. Opening stock, GRN #123"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={addSaving}
                onClick={() => void submitAddStock()}
                className="flex-1 flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-60"
              >
                {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save stock
              </button>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2.5 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal.open && (
        <Modal
          title={`${adjType === "ADD" ? "Add" : adjType === "DEDUCT" ? "Deduct" : "Set"} Stock — ${modal.item?.product?.name}`}
          onClose={() => setModal({ open: false, item: null })}>
          <div className="space-y-4">
            <div className="p-3 bg-sb-cream border border-sb-ink/10 rounded-lg">
              <p className="text-xs text-sb-ink/55">
                City:{" "}
                <span className="text-sb-ink">{modal.item ? cityLabel(modal.item) : "—"}</span>
              </p>
              <p className="text-xs text-sb-ink/55 mt-1">Current Stock: <span className="font-bold text-sb-ink">{modal.item?.quantity}</span></p>
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1.5 block">
                {adjType === "ADJUST" ? "Set stock to" : "Quantity to " + adjType.toLowerCase()} *
              </label>
              <input type="number" className={inp} min={0} value={adjQty}
                onChange={e => setAdjQty(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-sb-ink/55 mb-1.5 block">Reason</label>
              <input className={inp} value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="e.g. Restocking, damage, return..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={adjust} disabled={saving}
                className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg text-sm flex-1 justify-center text-white disabled:opacity-60 transition-colors ${
                  adjType === "ADD" ? "bg-sb-orange hover:bg-sb-orange-hover" :
                  adjType === "DEDUCT" ? "bg-sb-ink hover:bg-sb-ink/90" :
                  "bg-sb-orange hover:bg-sb-orange-hover text-white"
                }`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {adjType} Stock
              </button>
              <button onClick={() => setModal({ open: false, item: null })}
                className="px-4 py-2 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      <AdminDeleteConfirmModal
        open={!!pendingDelete}
        title={
          pendingDelete && pendingDelete.ids.length > 1
            ? `Delete ${pendingDelete.ids.length} inventory rows?`
            : "Delete this inventory row?"
        }
        description={
          pendingDelete
            ? pendingDelete.ids.length > 1
              ? `You are about to remove ${pendingDelete.ids.length} stock records (${pendingDelete.label}). Rows with reserved stock for open orders will be skipped. You can re-add stock later with Add / initialize stock.`
              : `Remove stock record for "${pendingDelete.label}". Rows with reserved units cannot be deleted until orders are fulfilled.`
            : undefined
        }
        confirmLabel="Delete"
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
        onConfirm={() => void runConfirmedDelete()}
      />
    </div>
  );
}
