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
}: Props) {
  const slug = product.slug || product._id || product.id;
  const isVariant = isVariantProduct(product);
  const variations = isVariant ? (product.variations || []) : [];
  const axes = useMemo(
    () => (isVariant ? axesForVariations(variations, categoryFilters) : []),
    [isVariant, variations, categoryFilters]
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
      variationLabel: isVariant && selectedVar ? formatVariationLabel(selectedVar) : undefined,
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
        {showAssured && (
          <div className="sf-listing-card__assured">
            <Shield className="w-3.5 h-3.5 text-[#E85A00]" aria-hidden />
            <span>StructBay Assured</span>
          </div>
        )}

        <Link to={productHref(slug)} className="sf-listing-card__title block hover:text-[#E85A00]">
          {product.name}
          {selectedVar && isVariant && variations.length > 1 ? (
            <span className="text-sb-ink-muted font-normal"> · {formatVariationLabel(selectedVar)}</span>
          ) : null}
        </Link>

        {brandName && <p className="sf-listing-card__brand">{brandName}</p>}

        <div className="sf-listing-card__price-row">
          <span className="sf-listing-card__price">₹{Number(displayUnit).toLocaleString("en-IN")}</span>
          {discount > 0 && (
            <span className="sf-listing-card__price-was">
              ₹{Number(displayRegP).toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <p className="sf-listing-card__price-meta">
          {displayPriceMeta(product, effectiveQty > 1 ? `qty ${effectiveQty}` : undefined)}
        </p>
        <ProductAvailabilityBadge info={availability} />
        {Number(selectedVar?.moq) > 1 && (
          <p className="sf-listing-card__moq">Min order: {selectedVar.moq} units</p>
        )}

        {isVariant && variations.length > 1 && (
          <label className="sf-listing-card__field">
            <span className="sf-listing-card__field-label">
              {axes.length === 1 ? axes[0].label : axes.length > 1 ? "Select option" : "Size / pack"}
            </span>
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

        {showExpress && (
          <p className="sf-listing-card__express">
            <Zap className="w-3 h-3" aria-hidden /> Express delivery
            {city ? ` · ${city}` : ""}
          </p>
        )}

        <p className="sf-listing-card__policy">7 day replacement · GST invoice</p>

        {bulkApplied && bulkFrom != null && bulkFrom < baseUnit && (
          <p className="sf-listing-card__bulk-applied">
            Bulk price applied · ₹{displayBulkFrom?.toLocaleString("en-IN")}/unit
          </p>
        )}

        {!bulkApplied && bulkFrom != null && bulkFrom < baseUnit && (
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
                  <Minus className="w-4 h-4" />
                </button>
                <span>{cartLine.qty}</span>
                <button type="button" aria-label="Increase" onClick={() => onUpdateQty(1)}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="sf-listing-card__add sf-listing-card__add--added" aria-live="polite">
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Added
              </span>
            </>
          ) : (
            <>
              <div className="sf-listing-card__qty">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span>{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>
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
