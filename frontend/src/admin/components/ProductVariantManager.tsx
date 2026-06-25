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

// ============================================================================
// Simple Add Variant Form
// ============================================================================

function AddVariantForm({
  productId,
  onAdded,
}: {
  productId: string;
  onAdded: (newVars: any[]) => void;
}) {
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [generating, setGenerating] = useState(false);

  const addAttribute = () => setAttributes((prev) => [...prev, { key: "", value: "" }]);
  const removeAttribute = (i: number) => setAttributes((prev) => prev.filter((_, j) => j !== i));
  const updateAttribute = (i: number, field: "key" | "value", value: string) => {
    setAttributes((prev) => prev.map((a, j) => (j === i ? { ...a, [field]: value } : a)));
  };

  const validAttributes = attributes.filter((a) => a.key.trim() && a.value.trim());

  const generate = async () => {
    if (validAttributes.length === 0) return alert("Add at least one attribute with a value.");

    setGenerating(true);
    try {
      const axes = validAttributes.map((a) => ({
        key: a.key.trim(),
        values: [{ value: a.value.trim(), colorCode: null }],
      }));

      const res: any = await apiFetch(`/products/${productId}/variations/generate-matrix`, {
        method: "POST",
        body: JSON.stringify({ axes }),
      });
      onAdded((res.data as any)?.created || []);
      setAttributes([{ key: "", value: "" }]);
    } catch (e: any) {
      alert(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-sb-ink/10 rounded-xl p-4 bg-white space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#000000] tracking-tight">Add Variant</h3>
        <p className="text-xs text-sb-ink/55 mt-1">
          Add a variant by specifying its attributes (e.g., Diameter: 10mm, Length: 5 Meter).
        </p>
      </div>

      <div className="space-y-3">
        {attributes.map((attr, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inp} flex-1`}
              placeholder="Attribute (e.g., Diameter, Length, Size)"
              value={attr.key}
              onChange={(e) => updateAttribute(i, "key", e.target.value)}
              list={`attr-suggestions-${i}`}
            />
            <datalist id={`attr-suggestions-${i}`}>
              {["Diameter", "Length", "Size", "Thickness", "Weight", "Grade", "Color"].map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <input
              className={`${inp} flex-1`}
              placeholder="Value (e.g., 10mm, 5 Meter)"
              title={`Value for ${attr.key || 'attribute'}`}
              value={attr.value}
              onChange={(e) => updateAttribute(i, "value", e.target.value)}
            />
            {attr.key.trim().toLowerCase() === "color" && (
              <ColorPreview value={attr.value} />
            )}
            {attributes.length > 1 && (
              <button
                type="button"
                onClick={() => removeAttribute(i)}
                className="p-2 text-sb-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove attribute"
                aria-label="Remove attribute"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addAttribute}
          className="flex items-center gap-1.5 text-sm text-sb-orange font-medium hover:text-sb-orange-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> Add another attribute
        </button>

        {validAttributes.length > 0 && (
          <button
            type="button"
            disabled={generating}
            onClick={generate}
            className="ml-auto flex items-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
            ) : (
              <><Plus className="w-4 h-4" /> Add Variant</>
            )}
          </button>
        )}
      </div>
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

      {/* Add Variant Form */}
      <div className="border-t border-sb-ink/10 pt-6">
        <AddVariantForm
          productId={productId}
          onAdded={(newVars) => onVariationsChange([...variations, ...newVars])}
        />
      </div>
    </div>
  );
}