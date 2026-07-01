/**
 * City-pricing wholesale slabs — mirrors `backend/src/services/checkoutPricing.service.js`
 * so PDP, cart, and checkout previews match server order totals.
 */

import { isVariantProduct } from "./productStructure";

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

export function variationIdFromRow(row: { variation?: unknown } | null | undefined): string {
  if (!row?.variation) return "";
  const v = row.variation;
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    if ("_id" in v && (v as { _id?: unknown })._id) return String((v as { _id: unknown })._id);
    if (typeof (v as { toString?: () => string }).toString === "function") {
      const s = (v as { toString: () => string }).toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  return String(v);
}

export function buildPricingSnapshotFromRow(row: {
  regularPrice?: unknown;
  salePrice?: unknown;
  sellingPrice?: unknown;
  mrp?: unknown;
  wholesaleSlabs?: unknown;
} | null | undefined): PricingSnapshot | null {
  if (!row || typeof row !== "object") return null;

  const saleRaw = (row as any).salePrice ?? (row as any).sellingPrice;
  const salePrice =
    saleRaw !== undefined && saleRaw !== null && saleRaw !== "" && Number.isFinite(Number(saleRaw))
      ? Number(saleRaw)
      : null;

  const regularRaw = (row as any).regularPrice ?? (row as any).mrp ?? salePrice;
  const regularPrice = Number(regularRaw);
  if (!Number.isFinite(regularPrice) || regularPrice < 0) {
    if (salePrice != null && salePrice >= 0) {
      return {
        regularPrice: salePrice,
        salePrice,
        wholesaleSlabs: normalizeWholesaleSlabs((row as any).wholesaleSlabs),
      };
    }
    return null;
  }

  return {
    regularPrice,
    salePrice,
    wholesaleSlabs: normalizeWholesaleSlabs((row as any).wholesaleSlabs),
  };
}

/** Pick pricing row: variation city row, inline variation.pricing, else base product `pricing` (simple only). */
export function pricingSnapshotFromProduct(product: any, variationId: string | null): PricingSnapshot | null {
  if (!product) return null;
  const isVariant = isVariantProduct(product);

  if (variationId) {
    if (Array.isArray(product.variationPricing)) {
      const vp = product.variationPricing.find((x: any) => variationIdFromRow(x) === variationId);
      const s = buildPricingSnapshotFromRow(vp);
      if (s) return s;
    }
    const vars = product.variations || [];
    const v = vars.find((x: any) => String(x._id) === variationId);
    const inline = buildPricingSnapshotFromRow(v?.pricing);
    if (inline) return inline;
  }

  if (isVariant) {
    const bounds = listingPriceBounds(product);
    if (bounds.min > 0) {
      return { regularPrice: bounds.max || bounds.min, salePrice: bounds.min, wholesaleSlabs: [] };
    }
    return null;
  }

  return buildPricingSnapshotFromRow(product.pricing);
}

/** Listing card unit price — respects per-variation (e.g. weight) city pricing when present. */
export function listingUnitPrice(product: any, variationId: string | null = null): number {
  const snap = pricingSnapshotFromProduct(product, variationId);
  if (snap) return resolveUnitPriceFromSnapshot(snap, 1);
  if (isVariantProduct(product) && !variationId) {
    return listingPriceBounds(product).min;
  }
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
  if (!prices.length && Array.isArray(product?.variations)) {
    for (const v of product.variations) {
      const snap = buildPricingSnapshotFromRow(v?.pricing);
      if (snap) {
        const p = resolveUnitPriceFromSnapshot(snap, 1);
        if (p > 0) prices.push(p);
      }
    }
  }
  if (!prices.length && !isVariantProduct(product)) {
    const snap = buildPricingSnapshotFromRow(product?.pricing);
    if (snap) {
      const p = resolveUnitPriceFromSnapshot(snap, 1);
      if (p > 0) prices.push(p);
    }
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
  gstType?: "inclusive" | "exclusive";
  gstPercentage?: number;
};

export function cartLineUnitPrice(line: CartLineForPricing): number {
  if (line.pricingSnapshot && (line.pricingSnapshot.wholesaleSlabs?.length > 0 || line.pricingSnapshot.regularPrice != null)) {
    return resolveUnitPriceFromSnapshot(line.pricingSnapshot, line.qty);
  }
  return line.price;
}

export function cartLineSubtotalExGst(line: CartLineForPricing): number {
  const price = cartLineUnitPrice(line);
  if (line.gstType === "inclusive") {
    const pct = Number.isFinite(line.gstPercentage) && line.gstPercentage! >= 0 ? line.gstPercentage! : 18;
    const base = price / (1 + pct / 100);
    return base * line.qty;
  }
  return price * line.qty;
}

export function cartLineGstAmount(line: CartLineForPricing, gstPct: number): number {
  const sub = cartLineSubtotalExGst(line);
  const pct = Number.isFinite(gstPct) && gstPct >= 0 ? gstPct : 18;
  return Math.round((sub * pct) / 100);
}
