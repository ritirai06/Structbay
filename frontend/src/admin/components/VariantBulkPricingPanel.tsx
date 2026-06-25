/**
 * VariantBulkPricingPanel
 * Lets admin fill one set of pricing/inventory fields and apply them to all or selected variants.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const inp =
  "w-full bg-white border border-sb-ink/15 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors";

type BulkFields = {
  sellingPrice: string;
  mrp: string;
  purchaseCost: string;
  deliveryCharge: string;
  taxPercentage: string;
  stock: string;
  reorderLevel: string;
  safetyStock: string;
};

type PricingFields = Pick<
  BulkFields,
  "sellingPrice" | "mrp" | "purchaseCost" | "deliveryCharge" | "taxPercentage"
>;

type InventoryFields = Pick<BulkFields, "stock" | "reorderLevel" | "safetyStock">;

type Props = {
  variationCount: number;
  selectedCount: number;
  hasColorVariants: boolean;
  onApplyPricing: (fields: PricingFields, scope: "all" | "selected") => void;
  onApplyInventory: (fields: InventoryFields, scope: "all" | "selected") => void;
};

export function VariantBulkPricingPanel({
  variationCount,
  selectedCount,
  hasColorVariants,
  onApplyPricing,
  onApplyInventory,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sameColorPricing, setSameColorPricing] = useState(hasColorVariants);
  const [fields, setFields] = useState<BulkFields>({
    sellingPrice: "",
    mrp: "",
    purchaseCost: "",
    deliveryCharge: "",
    taxPercentage: "",
    stock: "",
    reorderLevel: "",
    safetyStock: "",
  });

  const set = (k: keyof BulkFields, v: string) => setFields((f) => ({ ...f, [k]: v }));

  if (!variationCount) return null;

  const pricingFields: PricingFields = {
    sellingPrice: fields.sellingPrice,
    mrp: fields.mrp,
    purchaseCost: fields.purchaseCost,
    deliveryCharge: fields.deliveryCharge,
    taxPercentage: fields.taxPercentage,
  };

  const inventoryFields: InventoryFields = {
    stock: fields.stock,
    reorderLevel: fields.reorderLevel,
    safetyStock: fields.safetyStock,
  };

  return (
    <div className="border border-sb-ink/10 rounded-xl overflow-hidden bg-sb-cream-secondary">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-sb-ink hover:bg-sb-cream/60 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Bulk Update - {variationCount} Variants</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t border-sb-ink/10 p-4 space-y-5 bg-sb-cream">
          {hasColorVariants && (
            <label className="flex items-start gap-2 rounded-lg border border-sb-orange/20 bg-sb-orange/5 px-3 py-2 text-sm text-sb-ink/75">
              <input
                type="checkbox"
                checked={sameColorPricing}
                onChange={(e) => setSameColorPricing(e.target.checked)}
                className="mt-1 rounded border-sb-ink/25"
              />
              <span>
                <strong className="block text-sb-ink">Apply same pricing to all colors</strong>
                Pricing entered below is copied across every generated color combination.
              </span>
            </label>
          )}

          <div>
            <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-3">Pricing</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Selling Price</label>
                <input type="number" min={0} className={inp} value={fields.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">MRP</label>
                <input type="number" min={0} className={inp} value={fields.mrp} onChange={(e) => set("mrp", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Purchase Cost</label>
                <input type="number" min={0} className={inp} value={fields.purchaseCost} onChange={(e) => set("purchaseCost", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Delivery Charge</label>
                <input type="number" min={0} className={inp} value={fields.deliveryCharge} onChange={(e) => set("deliveryCharge", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Tax %</label>
                <input type="number" min={0} max={100} className={inp} value={fields.taxPercentage} onChange={(e) => set("taxPercentage", e.target.value)} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApplyPricing(pricingFields, "all")}
                className="px-4 py-2 bg-sb-orange/12 hover:bg-sb-orange/20 text-sb-orange text-sm font-medium rounded-lg transition-colors"
              >
                {sameColorPricing && hasColorVariants ? "Apply Same Pricing to All Colors" : "Apply Pricing to All"}
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => onApplyPricing(pricingFields, "selected")}
                className="px-4 py-2 border border-sb-ink/15 text-sb-ink/70 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                Apply Pricing to Selected ({selectedCount})
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-3">Inventory</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Available Stock</label>
                <input type="number" min={0} className={inp} value={fields.stock} onChange={(e) => set("stock", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Reorder Level</label>
                <input type="number" min={0} className={inp} value={fields.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Safety Stock</label>
                <input type="number" min={0} className={inp} value={fields.safetyStock} onChange={(e) => set("safetyStock", e.target.value)} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApplyInventory(inventoryFields, "all")}
                className="px-4 py-2 bg-sb-orange/12 hover:bg-sb-orange/20 text-sb-orange text-sm font-medium rounded-lg transition-colors"
              >
                Apply Inventory to All
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => onApplyInventory(inventoryFields, "selected")}
                className="px-4 py-2 border border-sb-ink/15 text-sb-ink/70 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                Apply Inventory to Selected ({selectedCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
