import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
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

export type AttributePair = { name: string; value: string };

const emptyPair = (): AttributePair => ({ name: "", value: "" });

function attributesToPairs(attrs: Record<string, unknown> | undefined): AttributePair[] {
  const rows = flattenVariationAttributes(attrs);
  return rows.length ? rows.map((r) => ({ name: r.key, value: r.value })) : [emptyPair()];
}

type Props = {
  productId: string;
  productSku: string;
  gstPercentage: number;
  activeCities: ActiveCity[];
  variations: any[];
  onVariationsChange: (next: any[]) => void;
};

export function ProductVariantManager({
  productId,
  productSku,
  gstPercentage,
  activeCities,
  variations,
  onVariationsChange,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPairs, setNewPairs] = useState<AttributePair[]>([emptyPair()]);
  const [newSku, setNewSku] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftConfigs, setDraftConfigs] = useState<Record<string, CityConfig[]>>({});

  const cityList = useMemo(() => activeCities, [activeCities]);

  const getCityConfigs = (v: any): CityConfig[] => {
    const id = String(v._id);
    if (draftConfigs[id]) return draftConfigs[id];
    return buildCityConfigsFromApi(cityList, v.cityConfigs, gstPercentage);
  };

  const addAttributeRow = () => setNewPairs((p) => [...p, emptyPair()]);

  const createVariation = async () => {
    const pairs = newPairs.filter((p) => p.name.trim() && p.value.trim());
    if (!pairs.length) return alert("Add at least one attribute (e.g. Size → 10 KG).");
    setCreating(true);
    try {
      const res = await apiFetch(`/products/${productId}/variations`, {
        method: "POST",
        body: JSON.stringify({
          attributePairs: pairs,
          sku: newSku.trim() || undefined,
        }),
      });
      onVariationsChange([...variations, res.data]);
      setNewPairs([emptyPair()]);
      setNewSku("");
      setExpandedId(String(res.data._id));
    } catch (e: any) {
      alert(e.message || "Could not add variation");
    } finally {
      setCreating(false);
    }
  };

  const saveVariationConfig = async (v: any) => {
    const id = String(v._id);
    const configs = getCityConfigs(v);
    const err = validateCityConfigs(configs);
    if (err) return alert(err);
    setSavingId(id);
    try {
      const { cityPricing, inventory } = cityConfigsToPayload(configs);
      const res = await apiFetch(`/products/${productId}/variations/${id}/configuration`, {
        method: "PATCH",
        body: JSON.stringify({ cityPricing, inventory }),
      });
      const cityConfigs = res.data?.cityConfigs || [];
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

  return (
    <div className="space-y-4">
      {variations.length > 0 && (
        <div className="space-y-3">
          {variations.map((v) => {
            const id = String(v._id);
            const open = expandedId === id;
            const chips = flattenVariationAttributes(v.attributes);
            const configs = getCityConfigs(v);
            return (
              <div key={id} className="border border-sb-ink/10 rounded-xl overflow-hidden bg-sb-cream-secondary">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-sb-cream/80"
                  onClick={() => setExpandedId(open ? null : id)}
                >
                  <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                    {chips.map((c) => (
                      <span key={`${c.key}-${c.value}`} className="text-xs bg-sb-cream border border-sb-ink/10 text-sb-ink/70 px-2 py-0.5 rounded-full">
                        {c.label}: {c.value}
                      </span>
                    ))}
                    {v.sku && (
                      <span className="text-xs font-mono text-sb-orange">{v.sku}</span>
                    )}
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>
                {open && (
                  <div className="border-t border-sb-ink/10 p-4 space-y-4 bg-sb-cream">
                    <p className="text-xs text-sb-ink/55">
                      Parent SKU: <span className="font-mono text-sb-ink">{productSku}</span> — variant SKU auto-generated if left blank.
                    </p>
                    <ProductCityConfig
                      cities={cityList}
                      configs={configs}
                      gstPercentage={gstPercentage}
                      onChange={(next) => setDraftConfigs((d) => ({ ...d, [id]: next }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingId === id}
                        onClick={() => void saveVariationConfig(v)}
                        className="flex items-center gap-2 bg-sb-orange text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                      >
                        {savingId === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save pricing & stock
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteVariation(id)}
                        className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm"
                      >
                        <Trash2 className="w-4 h-4" /> Delete variant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border border-sb-ink/10 rounded-xl p-4 space-y-3 bg-sb-cream">
        <p className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider">Add new variation</p>
        <p className="text-[11px] text-sb-ink/45">
          Use dynamic attributes for any category (Size, Grade, Diameter, Shade, Finish, Volume, etc.).
        </p>
        <div className="space-y-2">
          {newPairs.map((pair, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Attribute name</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-sb-ink/15 bg-white text-sm"
                  placeholder="e.g. Size"
                  value={pair.name}
                  onChange={(e) =>
                    setNewPairs((rows) => rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-sb-ink/50 mb-1 block">Value</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-sb-ink/15 bg-white text-sm"
                  placeholder="e.g. 10 KG"
                  value={pair.value}
                  onChange={(e) =>
                    setNewPairs((rows) => rows.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))
                  }
                />
              </div>
              <button
                type="button"
                title="Remove attribute"
                disabled={newPairs.length <= 1}
                onClick={() => setNewPairs((rows) => rows.filter((_, i) => i !== idx))}
                className="p-2 text-sb-ink/45 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addAttributeRow}
          className="flex items-center gap-1.5 text-sm text-sb-orange font-medium"
        >
          <Plus className="w-4 h-4" /> Add attribute
        </button>
        <div>
          <label className="text-xs text-sb-ink/50 mb-1 block">SKU (optional — auto: {productSku}-…)</label>
          <input
            className="w-full max-w-md px-3 py-2 rounded-lg border border-sb-ink/15 bg-white text-sm font-mono"
            placeholder={`${productSku}-10KG`}
            value={newSku}
            onChange={(e) => setNewSku(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={() => void createVariation()}
          className="flex items-center gap-2 bg-sb-orange/15 hover:bg-sb-orange/25 text-sb-orange font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-60"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add variation
        </button>
      </div>
    </div>
  );
}
