import { useMemo, useState, useCallback } from "react";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Plus,
  AlertTriangle,
  X,
  MapPin,
  Zap,
} from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";
import {
  type ActiveCity,
  type CityConfig,
  buildCityConfigsFromApi,
  cityConfigsToPayload,
  validateCityConfigs,
} from "../lib/productCityConfig";
import { ProductCityConfig } from "./ProductCityConfig";
import { flattenVariationAttributes } from "../../customer/lib/productAttributes";
import { type ProductAttribute } from "./ProductAttributesManager";

// ============================================================================
// Types
// ============================================================================

export type AttributePair = { name: string; value: string };

type Props = {
  productId: string;
  productSku: string;
  gstPercentage: number;
  activeCities: ActiveCity[];
  variations: any[];
  onVariationsChange: (next: any[]) => void;
  attributes?: ProductAttribute[];
};

// ============================================================================
// Constants & Styles
// ============================================================================

const inp =
  "w-full bg-white border border-sb-ink/15 rounded-lg px-3 py-2.5 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors";

// ============================================================================
// Helper Functions
// ============================================================================

function flattenAttributesToDisplay(attributes: any): { key: string; value: string; label: string }[] {
  return flattenVariationAttributes(attributes);
}

function getCombinationText(attributes: any): string {
  const chips = flattenAttributesToDisplay(attributes);
  return chips.map((c) => c.value).join(" + ");
}

// ============================================================================
// Simple Variant Row (Add/Edit)
// ============================================================================

type SimpleVariantRowProps = {
  variant: any;
  onSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
  activeCities: ActiveCity[];
  gstPercentage: number;
  cityConfigs: CityConfig[];
  onCityConfigsChange: (configs: CityConfig[]) => void;
};

function SimpleVariantRow({
  variant,
  onSave,
  onDelete,
  isSaving,
  activeCities,
  gstPercentage,
  cityConfigs,
  onCityConfigsChange,
}: SimpleVariantRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCityPricing, setShowCityPricing] = useState(false);
  const chips = flattenAttributesToDisplay(variant.attributes);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        expanded ? "border-sb-orange/30 shadow-md" : "border-sb-ink/10 hover:border-sb-ink/20"
      } bg-white`}
    >
      {/* Main Row - Always Visible */}
      <div className="flex items-center gap-3 p-3">
          {/* Variant Description */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c: any) => (
                <span
                  key={`${c.key}-${c.value}`}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-sb-cream-secondary border border-sb-ink/15 text-sb-ink rounded-full"
                >
                  {c.key.trim().toLowerCase() === "color" && (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: c.value,
                        border: "#fff #ffffff white yellow #ffff00".includes(c.value.trim().toLowerCase())
                          ? "1px solid #bbb"
                          : "1px solid #eee",
                        display: "inline-block",
                        marginRight: 6,
                      }}
                    />
                  )}
                  <span className="text-sb-ink/50 mr-1">{c.label}:</span>
                  <strong className="text-[#000000]">{c.value}</strong>
                </span>
              ))}
            </div>
            {variant.sku && (
              <p className="text-[10px] font-mono text-sb-orange/70 mt-1.5">{variant.sku}</p>
            )}
          </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-sb-orange hover:bg-sb-orange-hover text-white font-medium px-3 py-1.5 rounded-lg text-xs disabled:opacity-60 transition-colors"
          >
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save</>
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-sb-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete variant"
            aria-label="Delete variant"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-sb-ink/40 hover:text-sb-orange hover:bg-sb-orange/10 rounded-lg transition-colors shrink-0"
            title={expanded ? "Collapse" : "Expand"}
            aria-label={expanded ? "Collapse variant details" : "Expand variant details"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-sb-ink/10 bg-sb-cream-secondary p-4 space-y-4">
          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCityPricing(!showCityPricing)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-sb-ink/15 text-sb-ink/70 hover:border-sb-orange hover:text-sb-orange transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              {showCityPricing ? "Hide" : "Manage"} City Pricing & Inventory
            </button>
          </div>

          {/* City Pricing Panel (Collapsible) */}
          {showCityPricing && (
            <div className="border border-sb-ink/10 rounded-xl p-4 bg-white">
              <h5 className="text-sm font-semibold text-[#000000] mb-3 flex items-center gap-2 tracking-tight">
                <MapPin className="w-4 h-4 text-sb-orange" />
                City-wise Pricing & Inventory
              </h5>
              <ProductCityConfig
                configs={cityConfigs.length > 0 ? cityConfigs : buildCityConfigsFromApi(activeCities, variant.cityConfigs, gstPercentage)}
                defaultTax={gstPercentage}
                onChange={onCityConfigsChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Live color preview for color attributes.
 */
function ColorPreview({ value }: { value: string }) {
  // Color validation regexes
  const hex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgb = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgba = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/;
  const hsl = /^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/;
  const hsla = /^hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*(0|1|0?\.\d+)\s*\)$/;
  // Accepts CSS color names as fallback
  function isValidColor(str: string) {
    if (!str) return false;
    if (hex.test(str) || rgb.test(str) || rgba.test(str) || hsl.test(str) || hsla.test(str)) return true;
    // Try setting as a color on a dummy element
    const s = document.createElement("span").style;
    s.color = str;
    return !!s.color;
  }
  const valid = isValidColor(value.trim());
  // For very light colors, add a border
  function needsBorder(color: string) {
    const c = color.trim().toLowerCase();
    return c === "#fff" || c === "#ffffff" || c === "white" || c === "yellow" || c === "#ffff00";
  }
  return (
    <div style={{ display: "flex", alignItems: "center", marginLeft: 8 }}>
      {valid ? (
        <>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: value,
              border: needsBorder(value) ? "1px solid #bbb" : "1px solid #eee",
              display: "inline-block",
              marginRight: 8,
            }}
          />
          <span style={{ fontSize: 13, color: "#222" }}>{value}</span>
        </>
      ) : value.trim() ? (
        <span style={{ color: "#E85A00", fontSize: 12, marginLeft: 4 }}>Invalid color value.</span>
      ) : null}
    </div>
  );
}

function GenerateFromAttributes({
  productId,
  attributes = [],
  onGenerated,
}: {
  productId: string;
  attributes: ProductAttribute[];
  onGenerated: (newVars: any[]) => void;
}) {
  const [generating, setGenerating] = useState(false);

  const variantAttributes = attributes.filter(a => a.usedForVariants && a.values.length > 0);
  
  if (variantAttributes.length === 0) {
    return (
      <div className="border border-sb-ink/10 rounded-xl p-4 bg-white text-center">
        <p className="text-sm text-sb-ink/60">No variant attributes found.</p>
        <p className="text-xs text-sb-ink/40 mt-1">Go to the Attributes tab and add attributes with "Used for variants" checked.</p>
      </div>
    );
  }

  const generate = async () => {
    setGenerating(true);
    try {
      const axes = variantAttributes.map((a) => ({
        key: a.name,
        values: a.values.map(v => ({ value: v, colorCode: null })),
      }));

      const res: any = await apiFetch(`/products/${productId}/variations/generate-matrix`, {
        method: "POST",
        body: JSON.stringify({ axes }),
      });
      onGenerated((res.data as any)?.created || []);
    } catch (e: any) {
      alert(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-sb-ink/10 rounded-xl p-5 bg-white space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#000000] tracking-tight">Auto-Generate Variants</h3>
        <p className="text-xs text-sb-ink/55 mt-1">
          Automatically create all possible combinations based on the attributes defined in the Attributes tab.
        </p>
      </div>
      
      <div className="bg-sb-cream-secondary p-3 rounded-lg border border-sb-ink/10">
        <p className="text-xs font-semibold text-sb-ink mb-2">Attributes to be used:</p>
        <ul className="space-y-1">
          {variantAttributes.map(a => (
            <li key={a.name} className="text-xs text-sb-ink/70">
              <span className="font-medium text-sb-ink">{a.name}:</span> {a.values.join(", ")}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={generating}
        onClick={generate}
        className="flex items-center justify-center w-full gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        ) : (
          <><Zap className="w-4 h-4" /> Generate Variants</>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ProductVariantManager({
  productId,
  productSku,
  gstPercentage,
  activeCities,
  variations,
  onVariationsChange,
  attributes = [],
}: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftConfigs, setDraftConfigs] = useState<Record<string, CityConfig[]>>({});

  const getCityConfigs = useCallback((v: any): CityConfig[] => {
    const id = String(v._id);
    if (draftConfigs[id]) return draftConfigs[id];
    return buildCityConfigsFromApi(activeCities, v.cityConfigs, gstPercentage);
  }, [activeCities, draftConfigs, gstPercentage]);

  const saveVariationConfig = async (v: any) => {
    const id = String(v._id);
    const configs = getCityConfigs(v);
    const err = validateCityConfigs(configs);
    if (err) return alert(err);
    setSavingId(id);
    try {
      const { cityPricing, inventory } = cityConfigsToPayload(configs);
      const res: any = await apiFetch(`/products/${productId}/variations/${id}/configuration`, {
        method: "PATCH",
        body: JSON.stringify({ cityPricing, inventory }),
      });
      const cityConfigs = (res.data as any)?.cityConfigs || [];
      onVariationsChange(
        variations.map((row) => (String(row._id) === id ? { ...row, cityConfigs } : row))
      );
      setDraftConfigs((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    } catch (e: any) {
      alert(e.message || "Could not save variant configuration");
    } finally {
      setSavingId(null);
    }
  };

  const deleteVariation = async (varId: string) => {
    if (!window.confirm("Delete this variation?")) return;
    await apiFetch(`/products/${productId}/variations/${varId}`, { method: "DELETE" });
    onVariationsChange(variations.filter((v) => String(v._id) !== varId));
  };

  const handleVariantConfigChange = (variantId: string, configs: CityConfig[]) => {
    setDraftConfigs((prev) => ({ ...prev, [variantId]: configs }));
  };

  return (
    <div className="space-y-6">
      {/* Existing Variants Section */}
      {variations.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#000000] tracking-tight flex items-center gap-2">
              Product Variants
              <span className="text-xs font-medium text-sb-ink/60 bg-sb-cream-secondary px-2.5 py-0.5 rounded-full border border-sb-ink/10">
                {variations.length}
              </span>
            </h3>
          </div>

          {/* Variants List */}
          <div className="space-y-3">
            {variations.map((v) => (
              <div key={v._id}>
                <SimpleVariantRow
                  variant={v}
                  isSaving={savingId === String(v._id)}
                  activeCities={activeCities}
                  gstPercentage={gstPercentage}
                  cityConfigs={getCityConfigs(v)}
                  onCityConfigsChange={(configs) => handleVariantConfigChange(String(v._id), configs)}
                  onSave={() => saveVariationConfig(v)}
                  onDelete={() => deleteVariation(String(v._id))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Variants Form */}
      <div className="border-t border-sb-ink/10 pt-6">
        <GenerateFromAttributes
          productId={productId}
          attributes={attributes}
          onGenerated={(newVars) => onVariationsChange([...variations, ...newVars])}
        />
      </div>
    </div>
  );
}