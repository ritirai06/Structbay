/**
 * Normalize slabs so open-ended middle tiers get maxQty = nextMin - 1 (same as CSV compact import).
 */
function normalizeWholesaleSlabsForResolve(slabsIn) {
  const raw = Array.isArray(slabsIn) ? slabsIn : [];
  const arr = raw
    .map((s) => ({
      minQty: Number(s.minQty) || 0,
      maxQty:
        s.maxQty === undefined || s.maxQty === null || s.maxQty === ''
          ? null
          : Number(s.maxQty),
      price: Number(s.price),
    }))
    .filter(
      (s) =>
        Number.isFinite(s.price) &&
        s.price >= 0 &&
        Number.isFinite(s.minQty) &&
        s.minQty >= 0 &&
        (s.maxQty === null || (Number.isFinite(s.maxQty) && s.maxQty >= s.minQty)),
    );
  arr.sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i].maxQty === null && i < arr.length - 1) {
      const nextMin = arr[i + 1].minQty;
      arr[i].maxQty = nextMin > arr[i].minQty ? nextMin - 1 : arr[i].minQty;
    }
  }
  return arr;
}

/**
 * Resolve per-unit price from city pricing, applying wholesale MOQ slabs when applicable.
 * Slabs: first matching range [minQty, maxQty] wins (sorted by minQty ascending).
 */
function resolveUnitPriceFromCityPricing(pricing, quantity) {
  if (!pricing || quantity < 1) return 0;
  const base = pricing.salePrice ?? pricing.regularPrice;
  const slabs = normalizeWholesaleSlabsForResolve(pricing.wholesaleSlabs);
  if (!slabs.length) return base;

  for (const slab of slabs) {
    const min = slab.minQty ?? 0;
    const max = slab.maxQty == null ? Infinity : slab.maxQty;
    if (quantity >= min && quantity <= max && slab.price != null) {
      return slab.price;
    }
  }
  return base;
}

module.exports = { resolveUnitPriceFromCityPricing, normalizeWholesaleSlabsForResolve };
