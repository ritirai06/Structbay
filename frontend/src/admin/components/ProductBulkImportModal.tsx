import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BulkImportCsvModal } from "./BulkImportCsvModal";
import { adminFetch } from "../../lib/adminApi";
import {
  buildCsvFromTemplateColumns,
  parseGenericBulkCsv,
  parseProductBulkCsv,
  PRODUCT_BULK_TEMPLATE,
  type BulkTemplateColumn,
} from "../lib/adminBulkCsvParsers";

type Tab = "products" | "variants";

type CategoryOpt = { _id: string; name: string };

type TemplatePayload = {
  columns: BulkTemplateColumn[];
  sampleRows?: Record<string, string>[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const PRODUCT_INSTRUCTIONS = `Up to 200 rows per upload.

Required: name, sku, category (categorySlug or categoryId), brand (brandName or brandId).

productStructure (important):
• simple — one SKU; set city pricing in Pricing admin or Cities tab (not in this CSV)
• variant — parent SKU only; use "Variants + city pricing" tab for attributes + per-city stock/price

Optional: status (DRAFT|ACTIVE), gstPercentage, deliveryType (vendor_delivery|structbay_delivery), shortDescription, description, displayOrder, isFeatured, isTopSelling, isStructbayAssured.

Workflow: 1) Import parent products here → 2) Import variants (variant rows) per category.`;

const VARIANT_INSTRUCTIONS = `Up to 200 rows. Parent product must already exist with productStructure=variant.

Required: productSku, at least one attribute column, salePrice, stock, and cityId or cityName.
variantSku is optional — leave blank to auto-generate (e.g. UTCEM-10KG).
One row = one variant × one city (pricing + inventory + wholesale slabs).

Pick a category below to download a template with the correct attribute columns.`;

export function ProductBulkImportModal({ open, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("products");
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [productCategoryId, setProductCategoryId] = useState("");
  const [variantCategoryId, setVariantCategoryId] = useState("");
  const [productTemplateCsv, setProductTemplateCsv] = useState(PRODUCT_BULK_TEMPLATE);
  const [variantTemplateCsv, setVariantTemplateCsv] = useState("");
  const [productTemplateLoading, setProductTemplateLoading] = useState(false);
  const [variantTemplateLoading, setVariantTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("products");
    setProductCategoryId("");
    setVariantCategoryId("");
    setProductTemplateCsv(PRODUCT_BULK_TEMPLATE);
    setVariantTemplateCsv("");
    setTemplateError(null);
    void adminFetch<CategoryOpt[]>("/categories?limit=200&status=ACTIVE")
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategories([]));
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "products") return;
    if (!productCategoryId) {
      setProductTemplateCsv(PRODUCT_BULK_TEMPLATE);
      return;
    }
    let cancelled = false;
    setProductTemplateLoading(true);
    setTemplateError(null);
    void adminFetch<TemplatePayload>(
      `/products/bulk-import-template?categoryId=${encodeURIComponent(productCategoryId)}&mode=products`
    )
      .then((res) => {
        if (cancelled) return;
        const payload = res.data;
        if (!payload?.columns?.length) {
          setProductTemplateCsv(PRODUCT_BULK_TEMPLATE);
          return;
        }
        setProductTemplateCsv(
          buildCsvFromTemplateColumns(payload.columns, payload.sampleRows)
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setProductTemplateCsv(PRODUCT_BULK_TEMPLATE);
        setTemplateError(e instanceof Error ? e.message : "Failed to load product template.");
      })
      .finally(() => {
        if (!cancelled) setProductTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, productCategoryId]);

  useEffect(() => {
    if (!open || tab !== "variants" || !variantCategoryId) {
      setVariantTemplateCsv("");
      return;
    }
    let cancelled = false;
    setVariantTemplateLoading(true);
    setTemplateError(null);
    void adminFetch<TemplatePayload>(
      `/products/bulk-import-template?categoryId=${encodeURIComponent(variantCategoryId)}&mode=variants`
    )
      .then((res) => {
        if (cancelled) return;
        const payload = res.data;
        if (!payload?.columns?.length) {
          setVariantTemplateCsv("");
          setTemplateError("Template columns missing from server.");
          return;
        }
        setVariantTemplateCsv(
          buildCsvFromTemplateColumns(payload.columns, payload.sampleRows)
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setVariantTemplateCsv("");
        setTemplateError(e instanceof Error ? e.message : "Failed to load variant template.");
      })
      .finally(() => {
        if (!cancelled) setVariantTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, variantCategoryId]);

  if (!open) return null;

  const handleClose = () => {
    setProductCategoryId("");
    setVariantCategoryId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-ink/10 sticky top-0 bg-sb-cream-secondary z-10">
          <div className="flex gap-1 rounded-lg bg-sb-cream p-1 border border-sb-ink/10">
            <button
              type="button"
              onClick={() => setTab("products")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === "products" ? "bg-white text-sb-ink shadow-sm" : "text-sb-ink/55 hover:text-sb-ink"
              }`}
            >
              Parent products
            </button>
            <button
              type="button"
              onClick={() => setTab("variants")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === "variants" ? "bg-white text-sb-ink shadow-sm" : "text-sb-ink/55 hover:text-sb-ink"
              }`}
            >
              Variants + city pricing
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-sb-ink/55 hover:text-sb-ink text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {tab === "products" ? (
            <>
              <p className="text-xs text-sb-ink/50 mb-4 leading-relaxed whitespace-pre-line">{PRODUCT_INSTRUCTIONS}</p>
              <label className="block text-xs font-semibold text-sb-ink/60 mb-1.5">
                Category (optional — adds category filter columns to template)
              </label>
              <select
                value={productCategoryId}
                onChange={(e) => setProductCategoryId(e.target.value)}
                className="w-full mb-4 rounded-lg border border-sb-ink/15 bg-white px-3 py-2 text-sm text-sb-ink"
              >
                <option value="">Generic template (simple + variant examples)</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {productTemplateLoading && (
                <div className="flex items-center gap-2 text-sm text-sb-ink/55 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin text-sb-orange" />
                  Building product template…
                </div>
              )}
              {templateError && tab === "products" && (
                <div className="mb-3 text-sm text-sb-ink bg-sb-cream-secondary border border-sb-ink/15 rounded-lg px-3 py-2">
                  {templateError}
                </div>
              )}
              <BulkImportCsvModal
                key={`products-${productCategoryId || "generic"}`}
                embedded
                open
                onClose={handleClose}
                title=""
                instructions=""
                templateCsv={productTemplateCsv}
                templateFileName={
                  productCategoryId
                    ? `structbay-products-${productCategoryId}.csv`
                    : "structbay-products-bulk-template.csv"
                }
                apiPath="/products/bulk-import"
                parseRows={parseProductBulkCsv}
                onSuccess={onSuccess}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-sb-ink/50 mb-4 leading-relaxed whitespace-pre-line">{VARIANT_INSTRUCTIONS}</p>

              <label className="block text-xs font-semibold text-sb-ink/60 mb-1.5">
                Category (attribute columns in template)
              </label>
              <select
                value={variantCategoryId}
                onChange={(e) => setVariantCategoryId(e.target.value)}
                className="w-full mb-4 rounded-lg border border-sb-ink/15 bg-white px-3 py-2 text-sm text-sb-ink"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {variantTemplateLoading && (
                <div className="flex items-center gap-2 text-sm text-sb-ink/55 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin text-sb-orange" />
                  Building variant template…
                </div>
              )}
              {templateError && tab === "variants" && (
                <div className="mb-3 text-sm text-sb-ink bg-sb-cream-secondary border border-sb-ink/15 rounded-lg px-3 py-2">
                  {templateError}
                </div>
              )}

              {variantCategoryId && variantTemplateCsv && !variantTemplateLoading ? (
                <BulkImportCsvModal
                  key={`variants-${variantCategoryId}`}
                  embedded
                  open
                  onClose={handleClose}
                  title=""
                  instructions=""
                  templateCsv={variantTemplateCsv}
                  templateFileName={`structbay-variants-${variantCategoryId}.csv`}
                  apiPath="/products/bulk-import-variants"
                  parseRows={parseGenericBulkCsv}
                  onSuccess={onSuccess}
                />
              ) : (
                !variantTemplateLoading && (
                  <p className="text-xs text-sb-ink/45">
                    Select a category above to enable template download and CSV import.
                  </p>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
