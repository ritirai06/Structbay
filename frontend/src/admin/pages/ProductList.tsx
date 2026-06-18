import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Search, Plus, MoreVertical, Edit, Trash2, Archive, Loader2, RefreshCw, Shield, Zap, Star, TrendingUp,
  Copy, Check, Upload, ChevronDown, FileDown, Eye, BookOpen, FileText,
} from "lucide-react";
import { BulkImportCsvModal } from "../components/BulkImportCsvModal";
import { CatalogGenerateModal, type CatalogModalScope } from "../components/CatalogGenerateModal";
import { AdminBulkToolbar } from "../components/AdminBulkToolbar";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";
import { useAdminDeleteFlow } from "../hooks/useAdminDeleteFlow";
import { adminToast } from "../lib/adminToast";
import { parseProductBulkCsv, PRODUCT_BULK_TEMPLATE } from "../lib/adminBulkCsvParsers";
import { adminPath } from "../../lib/portalRoutes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@shared/components/ui/dropdown-menu";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import {
  type CatalogJobRow,
  createAndDownloadCatalog,
  downloadCompletedJob,
  regenerateAndDownload,
} from "../lib/catalogJobs";

const statusBadge = (status: string) =>
  status === "ACTIVE"
    ? "admin-badge admin-badge--active"
    : "admin-badge admin-badge--muted";

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-sb-orange" />
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(id).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    });
  };
  return (
    <button
      type="button"
      title={`Product id — full value copied on click\n${id}`}
      onClick={copy}
      className="inline-flex items-center gap-1 font-mono text-[10px] text-sb-ink/50 hover:text-sb-orange max-w-[9rem] truncate"
    >
      {id.slice(0, 10)}…
      {done ? <Check className="w-3 h-3 shrink-0 text-sb-orange" /> : <Copy className="w-3 h-3 shrink-0 opacity-60" />}
    </button>
  );
}

function escapeCsvCell(val: unknown) {
  const s = val == null ? "" : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatPriceRange(low: number | null | undefined, high: number | null | undefined) {
  if (low == null && high == null) return "—";
  if (low != null && high != null && low !== high) return `₹${low} – ₹${high}`;
  const p = low ?? high;
  return p != null ? `₹${p}` : "—";
}

function formatBytes(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ total: 0, active: 0, pages: 1, page: 1 });
  const [bulkOpen, setBulkOpen] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogScope, setCatalogScope] = useState<CatalogModalScope>("ALL");
  const [singleProductId, setSingleProductId] = useState<string | undefined>();

  const [historyJobs, setHistoryJobs] = useState<CatalogJobRow[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const deleteFlow = useAdminDeleteFlow();
  const catalogDeleteFlow = useAdminDeleteFlow();

  const deleteOneProduct = async (id: string) => {
    await apiFetch(`/products/${id}`, { method: "DELETE" });
  };

  const load = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      apiFetch(`/products?${params}`)
        .then((d) => {
          setLoadError(null);
          setProducts(d.data || []);
          const pg = d.pagination as { total?: number; active?: number; pages?: number; page?: number } | undefined;
          setPagination(
            pg && typeof pg.total === "number"
              ? {
                  total: pg.total,
                  active: typeof pg.active === "number" ? pg.active : 0,
                  pages: pg.pages ?? 1,
                  page: pg.page ?? page,
                }
              : { total: (d.data as unknown[])?.length ?? 0, active: 0, pages: 1, page: 1 }
          );
        })
        .catch((e: Error) => {
          setLoadError(e.message || "Could not load products");
          setProducts([]);
          setPagination({ total: 0, active: 0, pages: 1, page: 1 });
        })
        .finally(() => setLoading(false));
    },
    [search, statusFilter]
  );

  const loadHistory = useCallback(async () => {
    setHistoryBusy(true);
    try {
      const r = await apiFetch<CatalogJobRow[]>(`/admin/catalog/jobs?limit=12&includeArchived=true`);
      setHistoryJobs((r.data as CatalogJobRow[]) || []);
    } catch {
      setHistoryJobs([]);
    } finally {
      setHistoryBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setSelected({});
  }, [pagination.page, search, statusFilter]);

  const remove = (id: string, name: string) => {
    deleteFlow.requestDelete({ kind: "single", ids: [id], label: name });
  };

  const filtered = products.filter((p) => {
    if (!search && !statusFilter) return true;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedIds = filtered.filter((p) => selected[String(p._id)]).map((p) => String(p._id));
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleOne = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    filtered.forEach((p) => {
      next[String(p._id)] = true;
    });
    setSelected(next);
  };

  const openCatalog = (scope: CatalogModalScope, productId?: string) => {
    setCatalogScope(scope);
    setSingleProductId(productId);
    setCatalogOpen(true);
  };

  const exportProductsCsv = () => {
    const header = ["name", "sku", "productId", "category", "brand", "status", "slug"];
    const lines = [header.join(",")];
    for (const p of filtered) {
      lines.push(
        [
          escapeCsvCell(p.name),
          escapeCsvCell(p.sku),
          escapeCsvCell(p._id),
          escapeCsvCell(p.category?.name),
          escapeCsvCell(p.brand?.name),
          escapeCsvCell(p.status),
          escapeCsvCell(p.slug),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `structbay-products-page-${pagination.page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const storefrontProductHref = (slug: string) => `/products/${encodeURIComponent(slug)}`;

  const quickProductPdf = async (productId: string) => {
    try {
      await createAndDownloadCatalog({
        scopeType: "PRODUCT",
        productId,
        format: "pdf",
        filters: { status: "ACTIVE" },
        options: {
          includePricing: true,
          includeDocuments: true,
          includeVariants: true,
          includeQrCodes: true,
          includeVendorInfo: false,
        },
      });
      void loadHistory();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not generate PDF");
    }
  };

  const onDeleteJob = (id: string) => {
    catalogDeleteFlow.requestDelete({ kind: "single", ids: [id], label: "catalog PDF record" });
  };

  const onArchiveJob = async (id: string, archived: boolean) => {
    try {
      await apiFetch(`/admin/catalog/jobs/${id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ archived }),
      });
      void loadHistory();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const onRegenerateJob = async (id: string) => {
    try {
      await regenerateAndDownload(id);
      void loadHistory();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Regenerate failed");
    }
  };

  const onDownloadJob = async (job: CatalogJobRow) => {
    try {
      await downloadCompletedJob(job);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Download failed");
    }
  };

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="admin-page-title text-sb-ink">Product Management</h1>
          <p className="text-sb-ink/55 text-sm mt-0.5">
            {pagination.total || filtered.length} products · {pagination.active} active — Admin-only catalog control
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="admin-btn-outline"
          >
            <Upload className="w-4 h-4 text-sb-orange" /> Import products
          </button>
          <button
            type="button"
            onClick={exportProductsCsv}
            disabled={!filtered.length}
            className="admin-btn-outline disabled:opacity-45"
          >
            <FileDown className="w-4 h-4 text-sb-orange" /> Export products
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="admin-btn-outline">
                <BookOpen className="w-4 h-4 text-sb-orange" />
                Generate catalog
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-200 text-black min-w-[220px] shadow-lg">
              <DropdownMenuItem className="cursor-pointer" onSelect={() => openCatalog("ALL")}>
                All products catalog
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={selectedIds.length === 0}
                onSelect={() => openCatalog("SELECTED")}
              >
                Selected products ({selectedIds.length})
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => openCatalog("CATEGORY")}>
                Category catalog…
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => openCatalog("BRAND")}>
                Brand catalog…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to={adminPath("products", "create")} className="admin-btn-primary">
            <Plus className="w-4 h-4" /> Add product
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-sb-orange/25 bg-sb-orange/10 px-4 py-3 text-sm text-sb-ink/90">
          {loadError}
        </div>
      )}

      <div className="admin-toolbar flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search products or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg text-sm text-black px-3 py-2 bg-white focus:outline-none focus:border-sb-orange min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-black hover:border-sb-orange/50 bg-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header flex items-center justify-between">
          <div>
            <h3 className="font-medium text-black text-sm">
              Products <span className="text-gray-400 font-normal ml-1">({filtered.length})</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">
              Checkboxes apply to this page only. Use search/status to narrow the list, then select and run a selected-products catalog.
            </p>
          </div>
        </div>

        <div className="px-4 pt-3">
          <AdminBulkToolbar
            totalCount={filtered.length}
            selectedCount={selectedIds.length}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onDeleteSelected={() =>
              deleteFlow.requestDelete({
                kind: "bulk",
                ids: selectedIds,
                label: `${selectedIds.length} products`,
              })
            }
            onDeleteAll={() =>
              deleteFlow.requestDelete({
                kind: "bulk",
                ids: filtered.map((p) => String(p._id)),
                label: `all ${filtered.length} products on this page`,
              })
            }
            itemLabel="products"
            disabled={deleteFlow.busy || loading}
          />
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-data-table">
              <thead>
                <tr>
                  <th className="w-10 py-3 px-2">
                    <input
                      type="checkbox"
                      className="rounded border-sb-ink/25"
                      checked={allSelected}
                      onChange={toggleAll}
                      title="Select all on this page"
                    />
                  </th>
                  {["Product", "Product ID", "SKU", "Category", "Brand", "Cities", "Price Range", "Total Stock", "Badges", "Status", "Order", ""].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id} className="transition-colors">
                    <td className="py-3.5 px-2 align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-sb-ink/25"
                        checked={!!selected[String(p._id)]}
                        onChange={() => toggleOne(String(p._id))}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0]?.url ? (
                          <img
                            src={p.images[0].url}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-sb-ink/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-sb-cream-secondary border border-sb-ink/10 shrink-0 flex items-center justify-center text-sb-ink/40 text-xs">
                            IMG
                          </div>
                        )}
                        <div>
                          <span className="font-normal text-black text-sm">{p.name}</span>
                          {p.isFeatured && (
                            <span className="ml-2 text-[10px] font-medium text-sb-orange uppercase tracking-wide">Featured</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <CopyId id={String(p._id)} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-sb-ink/55">{p.sku}</td>
                    <td className="py-3.5 px-4 text-sb-ink/65">{p.category?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-sb-ink/65">{p.brand?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-sb-ink/65 text-xs max-w-[140px]">
                      {(p.citiesAvailable || []).length
                        ? (p.citiesAvailable as string[]).slice(0, 3).join(", ") +
                          ((p.citiesAvailable as string[]).length > 3 ? "…" : "")
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-sb-ink/65 text-xs whitespace-nowrap">
                      {formatPriceRange(p.lowestPrice, p.highestPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-sb-ink/65 text-xs">
                      {p.totalStock != null ? `${p.totalStock.toLocaleString()} units` : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1">
                        {p.isAssured && (
                          <span
                            title="StructBay Assured"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sb-cream-secondary text-sb-ink border border-sb-ink/12"
                          >
                            <Shield className="w-2.5 h-2.5" /> Assured
                          </span>
                        )}
                        {p.isExpress && (
                          <span
                            title="StructBay Express"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sb-orange/15 text-sb-orange border border-sb-orange/20"
                          >
                            <Zap className="w-2.5 h-2.5" /> Express
                          </span>
                        )}
                        {p.isTopSelling && (
                          <span
                            title="Top Selling"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sb-orange/12 text-sb-orange border border-sb-orange/20"
                          >
                            <TrendingUp className="w-2.5 h-2.5" /> Top
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`${statusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sb-ink/50 text-xs">{p.displayOrder}</td>
                    <td className="py-3.5 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-sb-ink/50 hover:text-sb-ink hover:bg-sb-cream-secondary transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-sb-cream border border-sb-ink/15 text-sb-ink min-w-[200px]">
                          {p.slug ? (
                            <DropdownMenuItem asChild className="hover:bg-sb-cream-secondary cursor-pointer text-sm gap-2">
                              <a href={storefrontProductHref(p.slug)} target="_blank" rel="noreferrer">
                                <Eye className="w-3.5 h-3.5 text-sb-ink/55" /> View on storefront
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem asChild className="hover:bg-sb-cream-secondary cursor-pointer text-sm gap-2">
                            <Link to={adminPath("products", String(p._id), "edit")}>
                              <Edit className="w-3.5 h-3.5 text-sb-ink/55" /> Edit product
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="hover:bg-sb-cream-secondary cursor-pointer text-sm gap-2"
                            onSelect={(ev) => {
                              ev.preventDefault();
                              openCatalog("PRODUCT", String(p._id));
                            }}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-sb-ink/55" /> Generate product catalog…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-sb-cream-secondary cursor-pointer text-sm gap-2"
                            onSelect={(ev) => {
                              ev.preventDefault();
                              void quickProductPdf(String(p._id));
                            }}
                          >
                            <FileText className="w-3.5 h-3.5 text-sb-ink/55" /> Download product PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="hover:bg-sb-cream-secondary cursor-pointer text-sb-ink/55 text-sm gap-2"
                            onSelect={(ev) => {
                              ev.preventDefault();
                              void remove(p._id, p.name);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-sb-ink/45 text-sm">No products match your filters</div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => load(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === pagination.page ? "bg-sb-orange text-white" : "bg-sb-cream border border-sb-ink/10 text-sb-ink/60 hover:border-sb-orange/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10 border border-sb-ink/10 rounded-xl overflow-hidden bg-sb-cream-secondary">
        <div className="px-5 py-4 border-b border-sb-ink/10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sb-ink text-sm">Catalog history</h3>
            <p className="text-xs text-sb-ink/50 mt-0.5">Recent PDF / Excel / CSV runs (stored on server)</p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="text-xs font-medium text-sb-orange hover:underline disabled:opacity-50"
            disabled={historyBusy}
          >
            Refresh
          </button>
        </div>
        {historyBusy && !historyJobs.length ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-sb-orange" />
          </div>
        ) : historyJobs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-sb-ink/45 text-center">No catalog jobs yet. Generate one from the actions above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-sb-ink/10 text-sb-ink/50 uppercase tracking-wide">
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-left py-2 px-4">Type</th>
                  <th className="text-left py-2 px-4">Format</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-right py-2 px-4">Products</th>
                  <th className="text-right py-2 px-4">Size</th>
                  <th className="text-left py-2 px-4">When</th>
                  <th className="text-right py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyJobs.map((j) => (
                  <tr key={j._id} className="border-b border-sb-ink/8 hover:bg-sb-cream/80">
                    <td className="py-2.5 px-4 text-sb-ink font-medium max-w-[200px]">
                      <div className="truncate" title={j.catalogName || ""}>
                        {j.catalogName || "—"}
                      </div>
                      {j.archived ? (
                        <span className="text-[10px] uppercase tracking-wide text-sb-ink/45">Archived</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-4 text-sb-ink/70">{j.scopeType}</td>
                    <td className="py-2.5 px-4 text-sb-ink/70">{String(j.format || "").toUpperCase()}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${
                          j.status === "COMPLETED"
                            ? "bg-emerald-500/12 text-emerald-800"
                            : j.status === "FAILED"
                              ? "bg-red-500/12 text-red-800"
                              : "bg-sb-ink/8 text-sb-ink/70"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-sb-ink/70">{j.productCount ?? "—"}</td>
                    <td className="py-2.5 px-4 text-right text-sb-ink/70">{formatBytes(j.fileSizeBytes)}</td>
                    <td className="py-2.5 px-4 text-sb-ink/55 whitespace-nowrap">
                      {j.createdAt ? new Date(j.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="text-sb-orange text-xs font-semibold hover:underline">
                            Manage
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-sb-cream border border-sb-ink/15 text-sb-ink min-w-[160px]">
                          {j.status === "COMPLETED" ? (
                            <DropdownMenuItem
                              className="cursor-pointer text-sm"
                              onSelect={(ev) => {
                                ev.preventDefault();
                                void onDownloadJob(j);
                              }}
                            >
                              Download
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="cursor-pointer text-sm"
                            onSelect={(ev) => {
                              ev.preventDefault();
                              void onRegenerateJob(j._id);
                            }}
                          >
                            Regenerate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-sm"
                            onSelect={(ev) => {
                              ev.preventDefault();
                              void onArchiveJob(j._id, !j.archived);
                            }}
                          >
                            {j.archived ? "Unarchive" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-sm text-red-700"
                            onSelect={(ev) => {
                              ev.preventDefault();
                              void onDeleteJob(j._id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BulkImportCsvModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Import products (CSV)"
        instructions={`Up to 200 rows per upload. Required: name, sku, category (categorySlug or categoryId), brand (brandName or brandId).\nOptional: status (DRAFT|ACTIVE|ARCHIVED), gstPercentage, shortDescription, description, displayOrder, isFeatured, isTopSelling, isAssured, isExpress (true/false).\nSlug is generated from name; images can be added after import.`}
        templateCsv={PRODUCT_BULK_TEMPLATE}
        templateFileName="structbay-products-bulk-template.csv"
        apiPath="/products/bulk-import"
        parseRows={parseProductBulkCsv}
        onSuccess={() => load(pagination.page)}
      />

      <CatalogGenerateModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        scope={catalogScope}
        selectedProductIds={selectedIds}
        singleProductId={singleProductId}
        onComplete={() => void loadHistory()}
      />

      <AdminDeleteConfirmModal
        open={!!deleteFlow.pending}
        title={deleteFlow.modalTitle}
        description={deleteFlow.modalDescription}
        busy={deleteFlow.busy}
        onCancel={deleteFlow.cancelDelete}
        onConfirm={() =>
          void deleteFlow.executeDelete(deleteOneProduct, () => {
            setSelected({});
            load(pagination.page);
          })
        }
      />

      <AdminDeleteConfirmModal
        open={!!catalogDeleteFlow.pending}
        title={catalogDeleteFlow.modalTitle}
        description="This removes the generated catalog file and job record from admin history."
        busy={catalogDeleteFlow.busy}
        onCancel={catalogDeleteFlow.cancelDelete}
        onConfirm={() =>
          void catalogDeleteFlow.executeDelete(
            async (id) => {
              await apiFetch(`/admin/catalog/jobs/${id}`, { method: "DELETE" });
            },
            () => void loadHistory()
          )
        }
      />
    </div>
  );
}
