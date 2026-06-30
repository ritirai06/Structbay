import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { adminFetch, adminUploadImage } from "../../lib/adminApi";
import { createAndDownloadCatalog } from "../lib/catalogJobs";

export type CatalogModalScope = "ALL" | "SELECTED" | "CATEGORY" | "BRAND" | "PRODUCT";

type Opt = { _id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  scope: CatalogModalScope;
  selectedProductIds: string[];
  singleProductId?: string;
  onComplete?: () => void;
};

const scopeTitle: Record<CatalogModalScope, string> = {
  ALL: "All products catalog",
  SELECTED: "Selected products catalog",
  CATEGORY: "Category catalog",
  BRAND: "Brand catalog",
  PRODUCT: "Single product catalog",
};

export function CatalogGenerateModal({
  open,
  onClose,
  scope,
  selectedProductIds,
  singleProductId,
  onComplete,
}: Props) {
  const [format, setFormat] = useState<"pdf" | "xlsx" | "csv" | "html">("pdf");
  const [catalogName, setCatalogName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [cityId, setCityId] = useState("");
  const [categories, setCategories] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const [includePricing, setIncludePricing] = useState(true);
  const [includeVendorInfo, setIncludeVendorInfo] = useState(false);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [includeVariants, setIncludeVariants] = useState(true);
  const [includeQrCodes, setIncludeQrCodes] = useState(true);

  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterBrandId, setFilterBrandId] = useState("");
  const [filterAssured, setFilterAssured] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [filterTopSelling, setFilterTopSelling] = useState(false);
  /** When true, catalog includes DRAFT + ACTIVE (default on — dev DBs often have no ACTIVE rows yet). */
  const [includeDrafts, setIncludeDrafts] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    setFormat("pdf");
    setCatalogName("");
    setCategoryId("");
    setBrandId("");
    setCityId("");
    setCoverUrl(null);
    setIncludePricing(true);
    setIncludeVendorInfo(false);
    setIncludeDocuments(true);
    setIncludeVariants(true);
    setIncludeQrCodes(true);
    setFilterCategoryId("");
    setFilterBrandId("");
    setFilterAssured(false);
    setFilterDelivery(false);
    setFilterFeatured(false);
    setFilterTopSelling(false);
    setIncludeDrafts(true);

    void Promise.all([
      adminFetch<Opt[]>(`/categories?status=ACTIVE&limit=500`).then((r) => setCategories((r.data as Opt[]) || [])),
      adminFetch<Opt[]>(`/brands?limit=500`).then((r) => setBrands((r.data as Opt[]) || [])),
      adminFetch<Opt[]>(`/cities?limit=200&status=ACTIVE`).then((r) => setCities((r.data as Opt[]) || [])),
    ]).catch(() => {
      /* lists optional */
    });
  }, [open, scope]);

  const canSubmit = useMemo(() => {
    if (scope === "SELECTED") return selectedProductIds.length > 0;
    if (scope === "CATEGORY") return !!categoryId;
    if (scope === "BRAND") return !!brandId;
    if (scope === "PRODUCT") return !!singleProductId;
    return true;
  }, [scope, selectedProductIds.length, categoryId, brandId, singleProductId]);

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setCoverUploading(true);
    try {
      const up = await adminUploadImage("/upload/banner", f);
      setCoverUrl(up.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  const buildFilters = () => {
    const filters: Record<string, unknown> = {};
    if (includeDrafts) filters.includeDrafts = true;
    else filters.status = "ACTIVE";

    if (scope === "ALL") {
      if (filterCategoryId) filters.categoryId = filterCategoryId;
      if (filterBrandId) filters.brandId = filterBrandId;
      if (filterAssured) filters.structbayAssured = true;
      if (filterDelivery) filters.structbayDelivery = true;
      if (filterFeatured) filters.isFeatured = true;
      if (filterTopSelling) filters.isTopSelling = true;
    }
    return filters;
  };

  const buildBody = (): Record<string, unknown> => {
    const filters = buildFilters();
    const options: Record<string, unknown> = {
      includePricing,
      includeVendorInfo,
      includeDocuments,
      includeVariants,
      includeQrCodes,
    };
    if (cityId) options.cityId = cityId;
    if (coverUrl) options.coverImageUrl = coverUrl;

    const body: Record<string, unknown> = {
      scopeType: scope,
      format,
      filters,
      options,
    };
    if (catalogName.trim()) body.catalogName = catalogName.trim();

    if (scope === "SELECTED") body.productIds = selectedProductIds;
    if (scope === "CATEGORY") body.categoryId = categoryId;
    if (scope === "BRAND") body.brandId = brandId;
    if (scope === "PRODUCT") body.productId = singleProductId;

    return body;
  };

  const submit = async () => {
    setError(null);
    if (!canSubmit) {
      setError(
        scope === "SELECTED"
          ? "Select at least one product using the checkboxes."
          : "Choose a category or brand to continue."
      );
      return;
    }
    setBusy(true);
    try {
      const job = await createAndDownloadCatalog(buildBody());
      if ((job.productCount ?? 0) === 0) {
        alert(
          'Your catalog file was created but it lists 0 products. If items are still in DRAFT, turn on "Include DRAFT products" in Generate catalog, or publish products as ACTIVE. Also check category/brand/badge filters.'
        );
      }
      onComplete?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-sb-ink/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-sb-cream-secondary border border-sb-ink/12 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-sb-ink">Generate catalog</h2>
            <p className="text-xs text-sb-ink/55 mt-0.5">{scopeTitle[scope]}</p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="p-2 rounded-lg text-sb-ink/50 hover:text-sb-ink hover:bg-sb-cream transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4 text-sm">
          {scope === "CATEGORY" && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-sb-ink/70">Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-sb-ink/12 bg-sb-cream px-3 py-2 text-sb-ink"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {scope === "BRAND" && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-sb-ink/70">Brand</span>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded-lg border border-sb-ink/12 bg-sb-cream px-3 py-2 text-sb-ink"
              >
                <option value="">Select brand…</option>
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {scope === "SELECTED" && (
            <p className="text-xs text-sb-ink/60 rounded-lg bg-sb-cream border border-sb-ink/10 px-3 py-2">
              {selectedProductIds.length} product{selectedProductIds.length === 1 ? "" : "s"} selected on this page.
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-sb-ink/70">Catalog name (optional)</span>
            <input
              value={catalogName}
              onChange={(e) => setCatalogName(e.target.value)}
              placeholder="e.g. June 2026 — Cement linesheet"
              className="w-full rounded-lg border border-sb-ink/12 bg-sb-cream px-3 py-2 text-sb-ink placeholder:text-sb-ink/35"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-sb-ink/70">Export format</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="w-full rounded-lg border border-sb-ink/12 bg-sb-cream px-3 py-2 text-sb-ink"
              >
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="html">HTML</option>
              </select>
            </label>
            <label className="block space-y-1 col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-sb-ink/70">City pricing (optional)</span>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full rounded-lg border border-sb-ink/12 bg-sb-cream px-3 py-2 text-sb-ink"
              >
                <option value="">Default / no city table</option>
                {cities.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-sb-ink/70">Cover image (PDF, optional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input type="file" accept="image/*" onChange={(e) => void onCoverFile(e)} className="text-xs max-w-full" />
              {coverUploading && <Loader2 className="w-4 h-4 animate-spin text-sb-orange" />}
              {coverUrl && (
                <button type="button" className="text-xs text-sb-orange underline" onClick={() => setCoverUrl(null)}>
                  Remove cover
                </button>
              )}
            </div>
          </div>

          <fieldset className="space-y-2 border border-sb-ink/10 rounded-xl p-3 bg-sb-cream/60">
            <legend className="text-xs font-semibold text-sb-ink/70 px-1">Include</legend>
            <label className="flex items-center gap-2 cursor-pointer text-sb-ink/85 pb-2 border-b border-sb-ink/10">
              <input type="checkbox" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} />
              <span>
                Include <strong>DRAFT</strong> products (with ACTIVE). Turn off for a live-storefront-only export.
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sb-ink/85">
              <input type="checkbox" checked={includePricing} onChange={(e) => setIncludePricing(e.target.checked)} />
              Pricing & MOQ / lead
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sb-ink/85">
              <input type="checkbox" checked={includeVendorInfo} onChange={(e) => setIncludeVendorInfo(e.target.checked)} />
              Vendor context (summary)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sb-ink/85">
              <input type="checkbox" checked={includeDocuments} onChange={(e) => setIncludeDocuments(e.target.checked)} />
              Technical documents (links)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sb-ink/85">
              <input type="checkbox" checked={includeVariants} onChange={(e) => setIncludeVariants(e.target.checked)} />
              Variants matrix
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sb-ink/85">
              <input type="checkbox" checked={includeQrCodes} onChange={(e) => setIncludeQrCodes(e.target.checked)} />
              Product QR codes (PDF)
            </label>
          </fieldset>

          {scope === "ALL" && (
            <fieldset className="space-y-2 border border-sb-ink/10 rounded-xl p-3 bg-sb-cream/60">
              <legend className="text-xs font-semibold text-sb-ink/70 px-1">Catalog filters (all products)</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="rounded-lg border border-sb-ink/12 bg-sb-cream px-2 py-1.5 text-xs"
                >
                  <option value="">Any category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterBrandId}
                  onChange={(e) => setFilterBrandId(e.target.value)}
                  className="rounded-lg border border-sb-ink/12 bg-sb-cream px-2 py-1.5 text-xs"
                >
                  <option value="">Any brand</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={filterAssured} onChange={(e) => setFilterAssured(e.target.checked)} />
                  Structbay Assured
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={filterDelivery} onChange={(e) => setFilterDelivery(e.target.checked)} />
                  Structbay Delivery
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={filterFeatured} onChange={(e) => setFilterFeatured(e.target.checked)} />
                  Featured
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={filterTopSelling} onChange={(e) => setFilterTopSelling(e.target.checked)} />
                  Top selling
                </label>
              </div>
            </fieldset>
          )}

          {error && (
            <div className="rounded-lg border border-sb-orange/30 bg-sb-orange/10 px-3 py-2 text-xs text-sb-ink whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-sb-ink/10 flex justify-end gap-2 shrink-0 bg-sb-cream-secondary">
          <button
            type="button"
            disabled={busy}
            onClick={() => onClose()}
            className="px-4 py-2 rounded-lg border border-sb-ink/15 text-sm font-medium text-sb-ink/80 hover:bg-sb-cream transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sb-orange hover:bg-sb-orange-hover text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generate & download
          </button>
        </div>
      </div>
    </div>
  );
}
