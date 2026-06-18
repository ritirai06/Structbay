/**
 * City-pricing wholesale slabs — mirrors `backend/src/services/checkoutPricing.service.js`
 * so PDP, cart, and checkout previews match server order totals.
 */

export type WholesaleSlab = { minQty: number; maxQty: number | null; price: number };

export type PricingSnapshot = {
  regularPrice: number;
  salePrice: number | null;
  wholesaleSlabs: WholesaleSlab[];
};

/** Same inference as compact CSV import: null max on a middle tier → nextMin - 1 */
export function normalizeWholesaleSlabs(raw: unknown): WholesaleSlab[] {
  const arr = Array.isArray(raw)
    ? raw
        .map((s: any) => ({
          minQty: Number(s?.minQty),
          maxQty:
            s?.maxQty === undefined || s?.maxQty === null || s?.maxQty === ""
              ? null
              : Number(s.maxQty),
          price: Number(s?.price),
        }))
        .filter(
          (s) =>
            Number.isFinite(s.minQty) &&
            s.minQty >= 0 &&
            Number.isFinite(s.price) &&
            s.price >= 0 &&
            (s.maxQty === null || (Number.isFinite(s.maxQty) && (s.maxQty as number) >= s.minQty))
        )
    : [];
  const sorted = [...arr].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].maxQty === null && i < sorted.length - 1) {
      const nextMin = sorted[i + 1].minQty;
      sorted[i].maxQty = nextMin > sorted[i].minQty ? nextMin - 1 : sorted[i].minQty;
    }
  }
  return sorted;
}

export function buildPricingSnapshotFromRow(row: {
  regularPrice?: unknown;
  salePrice?: unknown;
  wholesaleSlabs?: unknown;
} | null | undefined): PricingSnapshot | null {
  if (!row || typeof row !== "object") return null;
  const regularPrice = Number((row as any).regularPrice);
  if (!Number.isFinite(regularPrice) || regularPrice < 0) return null;
  const sp = (row as any).salePrice;
  const salePrice =
    sp !== undefined && sp !== null && sp !== "" && Number.isFinite(Number(sp)) ? Number(sp) : null;
  return {
    regularPrice,
    salePrice,
    wholesaleSlabs: normalizeWholesaleSlabs((row as any).wholesaleSlabs),
  };
}

export function variationIdFromRow(row: { variation?: unknown } | null | undefined): string {
  if (!row?.variation) return "";
  const v = row.variation;
  return String(typeof v === "object" && v !== null && "_id" in v ? (v as { _id: unknown })._id : v);
}

/** Pick pricing row: variation city row, else base product `pricing`. */
export function pricingSnapshotFromProduct(product: any, variationId: string | null): PricingSnapshot | null {
  if (!product) return null;
  if (variationId && Array.isArray(product.variationPricing)) {
    const vp = product.variationPricing.find((x: any) => variationIdFromRow(x) === variationId);
    const s = buildPricingSnapshotFromRow(vp);
    if (s) return s;
  }
  return buildPricingSnapshotFromRow(product.pricing);
}

/** Listing card unit price — respects per-variation (e.g. weight) city pricing when present. */
export function listingUnitPrice(product: any, variationId: string | null = null): number {
  const snap = pricingSnapshotFromProduct(product, variationId);
  if (snap) return resolveUnitPriceFromSnapshot(snap, 1);
  const vars = product?.variations || [];
  if (variationId) {
    const v = vars.find((x: any) => String(x._id) === variationId);
    const mrp = Number(v?.mrp);
    if (Number.isFinite(mrp) && mrp > 0) return mrp;
  }
  const base = Number(product?.price ?? 0);
  return Number.isFinite(base) && base > 0 ? base : 0;
}

/** Min/max across all variant price rows (for filters and "from ₹X" display). */
export function listingPriceBounds(product: any): { min: number; max: number } {
  const prices: number[] = [];
  if (Array.isArray(product?.variationPricing) && product.variationPricing.length) {
    for (const row of product.variationPricing) {
      const snap = buildPricingSnapshotFromRow(row);
      if (snap) {
        const p = resolveUnitPriceFromSnapshot(snap, 1);
        if (p > 0) prices.push(p);
      }
    }
  }
  if (!prices.length) {
    const base = listingUnitPrice(product, null);
    if (base > 0) prices.push(base);
  }
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function productMatchesPriceRange(
  product: any,
  minP: number | null,
  maxP: number | null
): boolean {
  if (minP == null && maxP == null) return true;
  const { min, max } = listingPriceBounds(product);
  const low = min > 0 ? min : listingUnitPrice(product, null);
  const high = max > 0 ? max : low;
  if (minP != null && high < minP) return false;
  if (maxP != null && low > maxP) return false;
  return true;
}

export function baseUnitBeforeSlabs(snap: PricingSnapshot): number {
  return snap.salePrice ?? snap.regularPrice;
}

export function resolveUnitPriceFromSnapshot(snap: PricingSnapshot | null | undefined, quantity: number): number {
  if (!snap || quantity < 1) return 0;
  const base = baseUnitBeforeSlabs(snap);
  const slabs = snap.wholesaleSlabs || [];
  if (!slabs.length) return base;
  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);
  for (const slab of sorted) {
    const min = slab.minQty ?? 0;
    const max = slab.maxQty == null ? Infinity : slab.maxQty;
    if (quantity >= min && quantity <= max && slab.price != null && Number.isFinite(slab.price)) {
      return slab.price;
    }
  }
  return base;
}

export function findActiveSlab(snap: PricingSnapshot | null | undefined, quantity: number): WholesaleSlab | null {
  if (!snap?.wholesaleSlabs?.length || quantity < 1) return null;
  const sorted = [...snap.wholesaleSlabs].sort((a, b) => a.minQty - b.minQty);
  for (const slab of sorted) {
    const min = slab.minQty ?? 0;
    const max = slab.maxQty == null ? Infinity : slab.maxQty;
    if (quantity >= min && quantity <= max) return slab;
  }
  return null;
}

export function slabTierLabel(slab: WholesaleSlab, unitLabel: string): string {
  const u = unitLabel || "units";
  const max = slab.maxQty;
  if (max == null || max === Infinity || !Number.isFinite(max)) {
    return `${slab.minQty}+ ${u}`;
  }
  if (slab.minQty <= 0) return `Up to ${max} ${u}`;
  return `${slab.minQty}–${max} ${u}`;
}

export function bulkSavingsExGst(snap: PricingSnapshot, quantity: number): number {
  if (quantity < 1) return 0;
  const base = baseUnitBeforeSlabs(snap);
  const eff = resolveUnitPriceFromSnapshot(snap, quantity);
  return Math.max(0, Math.round((base - eff) * quantity));
}

export type CartLineForPricing = {
  price: number;
  qty: number;
  pricingSnapshot?: PricingSnapshot | null;
};

export function cartLineUnitPrice(line: CartLineForPricing): number {
  if (line.pricingSnapshot && (line.pricingSnapshot.wholesaleSlabs?.length > 0 || line.pricingSnapshot.regularPrice != null)) {
    return resolveUnitPriceFromSnapshot(line.pricingSnapshot, line.qty);
  }
  return line.price;
}

export function cartLineSubtotalExGst(line: CartLineForPricing): number {
  return cartLineUnitPrice(line) * line.qty;
}

export function cartLineGstAmount(line: CartLineForPricing, gstPct: number): number {
  const sub = cartLineSubtotalExGst(line);
  const pct = Number.isFinite(gstPct) && gstPct >= 0 ? gstPct : 18;
  return Math.round((sub * pct) / 100);
}
