import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import {
  type CityConfig,
  computeStockStatus,
  stockStatusLabel,
  type WholesaleSlab,
} from "../lib/productCityConfig";

const inp =
  "w-full bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors";

type Props = {
  configs: CityConfig[];
  onChange: (configs: CityConfig[]) => void;
  defaultTax?: number;
};

function numVal(v: number | ""): string {
  return v === "" ? "" : String(v);
}

function parseNum(v: string): number | "" {
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

export function ProductCityConfig({ configs, onChange, defaultTax = 18 }: Props) {
  const updateCity = (cityId: string, patch: Partial<CityConfig>) => {
    onChange(configs.map((c) => (c.cityId === cityId ? { ...c, ...patch } : c)));
  };

  const updatePricing = (cityId: string, patch: Partial<CityConfig["pricing"]>) => {
    onChange(
      configs.map((c) =>
        c.cityId === cityId ? { ...c, pricing: { ...c.pricing, ...patch } } : c
      )
    );
  };

  const updateInventory = (cityId: string, patch: Partial<CityConfig["inventory"]>) => {
    onChange(
      configs.map((c) =>
        c.cityId === cityId ? { ...c, inventory: { ...c.inventory, ...patch } } : c
      )
    );
  };

  const toggleExpanded = (cityId: string) => {
    updateCity(cityId, { expanded: !configs.find((c) => c.cityId === cityId)?.expanded });
  };

  const copyPricingFrom = (targetCityId: string, sourceCityId: string) => {
    const source = configs.find((c) => c.cityId === sourceCityId);
    if (!source) return;
    updatePricing(targetCityId, {
      ...source.pricing,
      wholesaleSlabs: source.pricing.wholesaleSlabs.map((s) => ({ ...s })),
    });
  };

  const copyInventoryFrom = (targetCityId: string, sourceCityId: string) => {
    const source = configs.find((c) => c.cityId === sourceCityId);
    if (!source) return;
    updateInventory(targetCityId, { ...source.inventory });
  };

  const addSlab = (cityId: string) => {
    const cfg = configs.find((c) => c.cityId === cityId);
    if (!cfg) return;
    const last = cfg.pricing.wholesaleSlabs[cfg.pricing.wholesaleSlabs.length - 1];
    const nextMin = last ? (last.maxQty != null ? last.maxQty + 1 : last.minQty + 50) : 1;
    updatePricing(cityId, {
      wholesaleSlabs: [...cfg.pricing.wholesaleSlabs, { minQty: nextMin, maxQty: null, price: 0 }],
    });
  };

  const updateSlab = (cityId: string, idx: number, patch: Partial<WholesaleSlab>) => {
    const cfg = configs.find((c) => c.cityId === cityId);
    if (!cfg) return;
    const slabs = cfg.pricing.wholesaleSlabs.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updatePricing(cityId, { wholesaleSlabs: slabs });
  };

  const removeSlab = (cityId: string, idx: number) => {
    const cfg = configs.find((c) => c.cityId === cityId);
    if (!cfg) return;
    updatePricing(cityId, {
      wholesaleSlabs: cfg.pricing.wholesaleSlabs.filter((_, i) => i !== idx),
    });
  };

  if (!configs.length) {
    return (
      <p className="text-sm text-sb-ink/50 py-6 text-center">
        No active cities configured. Add serviceable cities under Cities management first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {configs.map((cfg) => {
        const qty = cfg.inventory.quantity !== "" ? Number(cfg.inventory.quantity) : 0;
        const reorder = cfg.inventory.reorderLevel !== "" ? Number(cfg.inventory.reorderLevel) : 50;
        const status = computeStockStatus(qty, reorder);
        const otherCities = configs.filter((c) => c.cityId !== cfg.cityId);

        return (
          <div
            key={cfg.cityId}
            className="border border-sb-ink/10 rounded-xl overflow-hidden bg-sb-cream-secondary"
          >
            <button
              type="button"
              onClick={() => toggleExpanded(cfg.cityId)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-sb-cream/60 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <ChevronDown
                  className={`w-4 h-4 text-sb-ink/50 transition-transform ${cfg.expanded ? "rotate-180" : ""}`}
                />
                <div>
                  <p className="font-semibold text-sb-ink text-sm">{cfg.cityName}</p>
                  <p className="text-xs text-sb-ink/50 mt-0.5">
                    {cfg.pricing.sellingPrice !== ""
                      ? `₹${cfg.pricing.sellingPrice}`
                      : "No pricing set"}
                    {cfg.inventory.quantity !== "" ? ` · ${cfg.inventory.quantity} units` : ""}
                    {cfg.pricing.isAvailable ? "" : " · Unavailable"}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  status === "IN_STOCK"
                    ? "bg-emerald-500/12 text-emerald-800"
                    : status === "LOW_STOCK"
                      ? "bg-amber-500/12 text-amber-800"
                      : "bg-red-500/12 text-red-800"
                }`}
              >
                {stockStatusLabel(status)}
              </span>
            </button>

            {cfg.expanded && (
              <div className="px-5 pb-5 space-y-6 border-t border-sb-ink/10 pt-5">
                {otherCities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      className={`${inp} max-w-[180px] text-xs`}
                      defaultValue=""
                      onChange={(e) => {
                        const src = e.target.value;
                        if (src) copyPricingFrom(cfg.cityId, src);
                        e.target.value = "";
                      }}
                    >
                      <option value="">Copy pricing from…</option>
                      {otherCities.map((c) => (
                        <option key={c.cityId} value={c.cityId}>
                          {c.cityName}
                        </option>
                      ))}
                    </select>
                    <select
                      className={`${inp} max-w-[180px] text-xs`}
                      defaultValue=""
                      onChange={(e) => {
                        const src = e.target.value;
                        if (src) copyInventoryFrom(cfg.cityId, src);
                        e.target.value = "";
                      }}
                    >
                      <option value="">Copy inventory from…</option>
                      {otherCities.map((c) => (
                        <option key={c.cityId} value={c.cityId}>
                          {c.cityName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-3">
                    City-wise Pricing
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Selling Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.pricing.sellingPrice)}
                        onChange={(e) =>
                          updatePricing(cfg.cityId, { sellingPrice: parseNum(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">MRP (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.pricing.mrp)}
                        onChange={(e) => updatePricing(cfg.cityId, { mrp: parseNum(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Purchase Cost (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.pricing.purchaseCost)}
                        onChange={(e) =>
                          updatePricing(cfg.cityId, { purchaseCost: parseNum(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Delivery Charge (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.pricing.deliveryCharge)}
                        onChange={(e) =>
                          updatePricing(cfg.cityId, { deliveryCharge: parseNum(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Tax %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={inp}
                        value={numVal(cfg.pricing.taxPercentage)}
                        onChange={(e) =>
                          updatePricing(cfg.cityId, {
                            taxPercentage: parseNum(e.target.value) || defaultTax,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-sb-ink/70 pb-2">
                        <input
                          type="checkbox"
                          checked={cfg.pricing.isAvailable}
                          onChange={(e) =>
                            updatePricing(cfg.cityId, { isAvailable: e.target.checked })
                          }
                          className="rounded border-sb-ink/25"
                        />
                        Available in this city
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider">
                      Wholesale Pricing Slabs
                    </h4>
                    <button
                      type="button"
                      onClick={() => addSlab(cfg.cityId)}
                      className="flex items-center gap-1 text-xs text-sb-orange hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add slab
                    </button>
                  </div>
                  {cfg.pricing.wholesaleSlabs.length === 0 ? (
                    <p className="text-xs text-sb-ink/45 italic">No wholesale slabs — retail price applies at all quantities.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-sb-ink/50 border-b border-sb-ink/10">
                            <th className="text-left py-2 pr-2">Min Qty</th>
                            <th className="text-left py-2 pr-2">Max Qty</th>
                            <th className="text-left py-2 pr-2">Unit Price (₹)</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {cfg.pricing.wholesaleSlabs.map((slab, idx) => (
                            <tr key={idx} className="border-b border-sb-ink/8">
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min={0}
                                  className={inp}
                                  value={slab.minQty}
                                  onChange={(e) =>
                                    updateSlab(cfg.cityId, idx, { minQty: Number(e.target.value) || 0 })
                                  }
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Unlimited"
                                  className={inp}
                                  value={slab.maxQty ?? ""}
                                  onChange={(e) =>
                                    updateSlab(cfg.cityId, idx, {
                                      maxQty: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min={0}
                                  className={inp}
                                  value={slab.price}
                                  onChange={(e) =>
                                    updateSlab(cfg.cityId, idx, { price: Number(e.target.value) || 0 })
                                  }
                                />
                              </td>
                              <td className="py-2">
                                <button
                                  type="button"
                                  onClick={() => removeSlab(cfg.cityId, idx)}
                                  className="p-1.5 text-sb-ink/45 hover:text-red-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-sb-ink/55 uppercase tracking-wider mb-3">
                    Inventory
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Available Stock</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.inventory.quantity)}
                        onChange={(e) =>
                          updateInventory(cfg.cityId, { quantity: parseNum(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Reserved Stock</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.inventory.reserved)}
                        onChange={(e) =>
                          updateInventory(cfg.cityId, { reserved: parseNum(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Reorder Level</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.inventory.reorderLevel)}
                        onChange={(e) =>
                          updateInventory(cfg.cityId, { reorderLevel: parseNum(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-sb-ink/55 mb-1 block">Safety Stock</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={numVal(cfg.inventory.safetyStock)}
                        onChange={(e) =>
                          updateInventory(cfg.cityId, { safetyStock: parseNum(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-sb-ink/45 mt-2 flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    Status: <strong>{stockStatusLabel(status)}</strong> (auto-calculated)
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
