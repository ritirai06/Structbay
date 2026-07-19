import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Check, Minus, Plus, Shield, Zap } from "lucide-react";
import { productHref } from "../lib/productRoutes";
import {
  formatVariationLabel,
  firstImageUrl,
} from "../lib/productAttributes";
import {
  axesForVariations,
  initSelectionsForVariation,
  firstBulkSlabMinQty,
  lowestBulkSlabPrice,
  resolveVariationFromSelections,
  variationOptionLabel,
  uniqueValuesForAxis,
} from "../lib/variationSelectors";
import {
  listingUnitPrice,
  pricingSnapshotFromProduct,
  resolveUnitPriceFromSnapshot,
  findActiveSlab,
  baseUnitBeforeSlabs,
  type PricingSnapshot,
} from "../lib/wholesalePricing";
import { displayUnitFromExGst, displayPriceMeta } from "../lib/displayPricing";
import type { CartItem } from "../context/AppContext";
import { isVariantProduct, validateCartLine } from "../lib/productStructure";
import { availabilityForProduct } from "../lib/productAvailability";
import { ProductAvailabilityBadge } from "./ProductAvailabilityBadge";

type Props = {
  product: any;
  categoryFilters: Array<{ key?: string; sortOrder?: number }>;
  city?: string;
  selectedVariationId: string;
  onVariationChange: (variationId: string) => void;
  cartLine?: CartItem;
  onAdd: (payload: {
    qty: number;
    variationId?: string;
    variationLabel?: string;
    unitPrice: number;
    pricingSnapshot: PricingSnapshot | null;
    image: string;
  }) => void;
  onUpdateQty: (delta: number) => void;
  simple?: boolean;
};

export function ListingProductCard({
  product,
  categoryFilters,
  city,
  selectedVariationId,
  onVariationChange,
  cartLine,
  onAdd,
  onUpdateQty,
  simple = false,
}: Props) {
  const slug = product.slug || product._id || product.id;
  const isVariant = isVariantProduct(product);
  const variations = isVariant ? (product.variations || []) : [];
  const axes = useMemo(
    () => (isVariant ? axesForVariations(variations, categoryFilters, product?.attributes || []) : []),
    [isVariant, variations, categoryFilters, product?.attributes]
  );

  const seedVar = useMemo(() => {
    if (selectedVariationId) {
      return variations.find((v: any) => String(v._id) === selectedVariationId) || variations[0];
    }
    return variations[0];
  }, [variations, selectedVariationId]);

  const [selections, setSelections] = useState<Record<string, string>>(() =>
    axes.length ? initSelectionsForVariation(seedVar, axes) : {}
  );
  const [qty, setQty] = useState(1);
  const [bulkUnlocked, setBulkUnlocked] = useState(false);
  const [customColorText, setCustomColorText] = useState("");

  const selectedVar = useMemo(() => {
    if (!isVariant) return null;
    if (selectedVariationId) {
      const byId = variations.find((v: any) => String(v._id) === selectedVariationId);
      if (byId) return byId;
    }
    if (axes.length) return resolveVariationFromSelections(variations, selections);
    return variations[0] ?? null;
  }, [isVariant, variations, selectedVariationId, axes.length, selections]);

  const vid = isVariant && selectedVar?._id ? String(selectedVar._id) : "";
  const snap = pricingSnapshotFromProduct(product, vid || null);
  const effectiveQty = cartLine?.qty ?? qty;
  const unitEx = snap ? resolveUnitPriceFromSnapshot(snap, effectiveQty) : listingUnitPrice(product, vid || null);
  const hasPrice = unitEx > 0;
  const availability = availabilityForProduct(product, vid || null, hasPrice);
  const baseUnit = snap ? baseUnitBeforeSlabs(snap) : unitEx;
  const regP = snap?.regularPrice ?? unitEx;
  const discount = regP && unitEx < regP ? Math.round((1 - unitEx / regP) * 100) : 0;
  const bulkFrom = lowestBulkSlabPrice(snap);
  const bulkMinQty = firstBulkSlabMinQty(snap);
  const activeSlab = findActiveSlab(snap, effectiveQty);
  const bulkApplied = !!activeSlab || (bulkUnlocked && bulkFrom != null && unitEx <= bulkFrom);
  const displayUnit = displayUnitFromExGst(unitEx, product);
  const displayRegP = displayUnitFromExGst(regP, product);
  const displayBulkFrom = bulkFrom != null ? displayUnitFromExGst(bulkFrom, product) : null;
  const image = firstImageUrl(selectedVar?.images?.length ? selectedVar.images : product.images);
  const brandName = product.brand?.name || product.brand || "";
  const showAssured = !!(product.isStructbayAssured || product.isAssured || product.displayStructbayAssured);
  const showExpress = !!(product.isExpress || product.isStructbayDelivery || product.displayStructbayDelivery);

  useEffect(() => {
    if (!import.meta.env.DEV || !isVariant) return;
    console.debug("[variant-pricing]", {
      product: product.name,
      selectedCity: city,
      selectedVariantId: vid,
      selectedVariantLabel: selectedVar ? formatVariationLabel(selectedVar) : null,
      unitPriceExGst: unitEx,
      hasPrice,
      variationPricing: product.variationPricing,
      inlinePricing: selectedVar?.pricing,
      stock: selectedVar?.availableStock,
      inStock: selectedVar?.inStock,
      availability: availability.label,
    });
  }, [city, vid, unitEx, hasPrice, selectedVar, availability.label, isVariant, product]);

  useEffect(() => {
    if (!axes.length || !seedVar) return;
    setSelections(initSelectionsForVariation(seedVar, axes));
    setBulkUnlocked(false);
    setQty(1);
    setCustomColorText("");
  }, [slug, selectedVariationId]);

  useEffect(() => {
    if (!vid || cartLine) return;
    const moq = Math.max(1, Math.floor(Number(selectedVar?.moq) || 1));
    setQty((q) => (q < moq ? moq : q));
  }, [vid, selectedVar?.moq, cartLine]);

  useEffect(() => {
    if (activeSlab) setBulkUnlocked(true);
  }, [activeSlab?.minQty, activeSlab?.price]);

  const handleVariationSelect = (variationId: string) => {
    onVariationChange(variationId);
    const v = variations.find((x: any) => String(x._id) === variationId);
    if (v && axes.length) setSelections(initSelectionsForVariation(v, axes));
    setBulkUnlocked(false);
    setQty(1);
  };

  const handleAttributeSelect = (axisKey: string, value: string) => {
    const next = { ...selections, [axisKey]: value };
    const resolved = resolveVariationFromSelections(variations, next);
    
    if (resolved?._id) {
      onVariationChange(String(resolved._id));
      setSelections(initSelectionsForVariation(resolved, axes));
    } else {
      setSelections(next);
    }
    setBulkUnlocked(false);
    setQty(1);
  };

  const handleUnlockBulk = () => {
    if (!bulkMinQty) return;
    const target = Math.max(1, bulkMinQty);
    if (cartLine) {
      const delta = target - cartLine.qty;
      if (delta !== 0) onUpdateQty(delta);
    } else {
      setQty(target);
    }
    setBulkUnlocked(true);
  };

  const handleAdd = () => {
    const addQty = Math.max(1, cartLine ? cartLine.qty : qty);
    const check = validateCartLine(product, isVariant ? vid || undefined : undefined);
    if (!check.ok) {
      alert(check.message);
      return;
    }
    if (!availability.canAddToCart) {
      alert(
        availability.stockStatus === "UNPRICED"
          ? "Pricing is not available for this option in your city."
          : "This variant is out of stock in your city."
      );
      return;
    }
    const priceAtQty = snap ? resolveUnitPriceFromSnapshot(snap, addQty) : unitEx;
    onAdd({
      qty: addQty,
      variationId: isVariant ? vid || undefined : undefined,
      variationLabel: isVariant && selectedVar 
        ? formatVariationLabel(selectedVar) + ((selections["Color"] === "Custom" || selections["Colour"] === "Custom") && customColorText ? ` (Custom: ${customColorText})` : "") 
        : undefined,
      unitPrice: priceAtQty,
      pricingSnapshot: snap,
      image: image || "",
    });
    if (!cartLine) setQty(1);
  };

  const priceForOption = (variationId: string) => {
    const s = pricingSnapshotFromProduct(product, variationId);
    const ex = s ? resolveUnitPriceFromSnapshot(s, effectiveQty) : listingUnitPrice(product, variationId);
    return displayUnitFromExGst(ex, product);
  };

  const optionSuffix = (variationId: string) => {
    const ex = pricingSnapshotFromProduct(product, variationId);
    const unit = ex ? resolveUnitPriceFromSnapshot(ex, 1) : listingUnitPrice(product, variationId);
    const info = availabilityForProduct(product, variationId, unit > 0);
    if (info.stockStatus === "OUT_OF_STOCK") return " · Out of stock";
    if (info.stockStatus === "LOW_STOCK") return " · Low stock";
    if (info.stockStatus === "UNPRICED") return " · No price";
    return "";
  };

  return (
    <article className="sf-listing-card group">
      <Link to={productHref(slug)} className="sf-listing-card__image-wrap block">
        {discount > 0 && (
          <span className="sf-listing-card__discount">{discount}% OFF</span>
        )}
        {image ? (
          <img src={image} alt={product.name} className="sf-listing-card__image" loading="lazy" />
        ) : (
          <div className="sf-listing-card__image sf-listing-card__image--empty" />
        )}
      </Link>

      <div className="sf-listing-card__body">
        {!simple && showAssured && (
          <div className="sf-listing-card__assured">
            <Shield className="w-3.5 h-3.5 text-[#E85A00]" aria-hidden />
            <span>Structbay Assured</span>
          </div>
        )}

        <Link to={productHref(slug)} className="sf-listing-card__title block hover:text-[#E85A00]">
          {product.name}
          {selectedVar && isVariant && variations.length > 1 ? (
            <span className="text-sb-ink-muted font-normal"> · {formatVariationLabel(selectedVar)}</span>
          ) : null}
        </Link>

        {!simple && brandName && <p className="sf-listing-card__brand">{brandName}</p>}

        <div className="sf-listing-card__price-row">
          <span className="sf-listing-card__price">₹{Number(displayUnit).toLocaleString("en-IN")}</span>
          {discount > 0 && (
            <span className="sf-listing-card__price-was">
              ₹{Number(displayRegP).toLocaleString("en-IN")}
            </span>
          )}
        </div>
        {!simple && (
          <p className="sf-listing-card__price-meta">
            {displayPriceMeta(product, effectiveQty > 1 ? `qty ${effectiveQty}` : undefined)}
          </p>
        )}
        {!simple && <ProductAvailabilityBadge info={availability} />}
        {!simple && Number(selectedVar?.moq) > 1 && (
          <p className="sf-listing-card__moq">Min order: {selectedVar.moq} units</p>
        )}

        {!simple && isVariant && axes.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 mb-3">
            {axes.map((axis) => {
              const options = uniqueValuesForAxis(variations, axis.key, selections);
              if (!options.length) return null;

              const _axisKeyLower = axis.key.toLowerCase();
              const isColorAxis =
                _axisKeyLower.startsWith("color") ||
                _axisKeyLower.startsWith("colour");

              if (isColorAxis) {
                const inputVal = customColorText;
                const currentSelected = selections[axis.key] || "";
                // Only filter/show suggestions when user has typed something
                const filtered = inputVal.trim()
                  ? options.filter((o) =>
                      o.toLowerCase().includes(inputVal.trim().toLowerCase())
                    )
                  : [];

                return (
                  <div key={axis.key}>
                    <span className="sf-listing-card__field-label">{axis.label}</span>
                    {/* Show currently selected color as a small badge */}
                    {currentSelected && !inputVal.trim() && (
                      <p className="text-[11px] text-gray-500 mt-0.5 mb-1">
                        Selected: <span className="font-semibold text-sb-ink">{currentSelected}</span>
                      </p>
                    )}
                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={customColorText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomColorText(val);
                          // Auto-select if typed text exactly matches an option (case-insensitive)
                          const exact = options.find(
                            (o) => o.toLowerCase() === val.trim().toLowerCase()
                          );
                          if (exact) handleAttributeSelect(axis.key, exact);
                        }}
                        placeholder={currentSelected ? currentSelected : "Type color name…"}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange"
                      />
                    </div>
                    {/* Suggestion pills — only when user has typed something */}
                    {inputVal.trim() && filtered.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {filtered.map((opt) => {
                          const partial = { ...selections, [axis.key]: opt };
                          const v = resolveVariationFromSelections(variations, partial);
                          const isOos =
                            v &&
                            availabilityForProduct(product, String(v._id), true)
                              .stockStatus === "OUT_OF_STOCK";
                          const isActive = currentSelected === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={!!isOos}
                              onClick={() => {
                                setCustomColorText(opt);
                                handleAttributeSelect(axis.key, opt);
                              }}
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                isActive
                                  ? "bg-[#E85A00] text-white border-[#E85A00]"
                                  : isOos
                                  ? "border-gray-200 text-gray-400 line-through cursor-not-allowed"
                                  : "border-gray-300 text-gray-700 hover:border-[#E85A00] hover:text-[#E85A00]"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {inputVal.trim() && filtered.length === 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">No matching color found.</p>
                    )}
                  </div>
                );
              }

              // Non-color axes: keep as dropdown
              return (
                <div key={axis.key}>
                  <label className="sf-listing-card__field">
                    <span className="sf-listing-card__field-label">{axis.label}</span>
                    <select
                      className="sf-listing-card__select"
                      value={selections[axis.key] || ""}
                      onChange={(e) => handleAttributeSelect(axis.key, e.target.value)}
                    >
                      {options.map((opt) => {
                        const partial = { ...selections, [axis.key]: opt };
                        const v = resolveVariationFromSelections(variations, partial);
                        const isOos =
                          v &&
                          availabilityForProduct(product, String(v._id), true).stockStatus ===
                            "OUT_OF_STOCK";
                        return (
                          <option key={opt} value={opt} disabled={isOos}>
                            {opt} {isOos ? " (Out of stock)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {!simple && isVariant && axes.length === 0 && variations.length > 1 && (
          <label className="sf-listing-card__field">
            <span className="sf-listing-card__field-label">Size / pack</span>
            <select
              className="sf-listing-card__select"
              value={vid}
              onChange={(e) => handleVariationSelect(e.target.value)}
            >
              {variations.map((v: any) => {
                const id = String(v._id);
                const p = priceForOption(id);
                return (
                  <option key={id} value={id}>
                    {variationOptionLabel(v, p, city)}
                    {optionSuffix(id)}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        {!simple && showExpress && (
          <p className="sf-listing-card__express">
            <Zap className="w-3 h-3" aria-hidden /> Express delivery
            {city ? ` · ${city}` : ""}
          </p>
        )}

        {!simple && <p className="sf-listing-card__policy">{product.replacementPolicy || "No Replacement"} · GST invoice</p>}

        {!simple && bulkApplied && bulkFrom != null && bulkFrom < baseUnit && (
          <p className="sf-listing-card__bulk-applied">
            Bulk price applied · ₹{displayBulkFrom?.toLocaleString("en-IN")}/unit
          </p>
        )}

        {!simple && !bulkApplied && bulkFrom != null && bulkFrom < baseUnit && (
          <button type="button" className="sf-listing-card__bulk-hint" onClick={handleUnlockBulk}>
            Unlock bulk prices from ₹{displayBulkFrom?.toLocaleString("en-IN")}
            {bulkMinQty && bulkMinQty > 1 ? ` (${bulkMinQty}+ ${product.unit || "units"})` : ""}
          </button>
        )}

        <div className="sf-listing-card__actions">
          {cartLine ? (
            <>
              <div className="sf-listing-card__qty sf-listing-card__qty--active">
                <button type="button" aria-label="Decrease" onClick={() => onUpdateQty(-1)}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={cartLine.qty}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    const target = val ? Number(val) : 0;
                    if (target >= 0) {
                      onUpdateQty(target - cartLine.qty);
                    }
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (!val || val < 1) {
                      onUpdateQty(1 - cartLine.qty);
                    }
                  }}
                  className="w-8 text-center bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-sm font-semibold"
                />
                <button type="button" aria-label="Increase" onClick={() => onUpdateQty(1)}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="sf-listing-card__add sf-listing-card__add--added" aria-live="polite">
                Added
              </span>
            </>
          ) : (
            <>
              <div className="sf-listing-card__qty">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={qty}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setQty(val ? Number(val) : ("" as any));
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (!val || val < 1) setQty(1);
                    else setQty(val);
                  }}
                  className="w-8 text-center bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-sm font-semibold"
                />
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Number(q || 1) + 1)}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                className="sf-listing-card__add"
                onClick={handleAdd}
                disabled={!availability.canAddToCart || !hasPrice}
              >
                Add
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
