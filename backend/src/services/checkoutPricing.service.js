/**
 * Resolve per-unit price from city pricing, applying wholesale MOQ slabs when applicable.
 * Slabs: first matching range [minQty, maxQty] wins (admin should configure non-overlapping ranges).
 */
function resolveUnitPriceFromCityPricing(pricing, quantity) {
  if (!pricing || quantity < 1) return 0;
  const base = pricing.salePrice ?? pricing.regularPrice;
  const slabs = Array.isArray(pricing.wholesaleSlabs) ? [...pricing.wholesaleSlabs] : [];
  if (!slabs.length) return base;

  const sorted = slabs.sort((a, b) => (a.minQty || 0) - (b.minQty || 0));
  for (const slab of sorted) {
    const min = slab.minQty ?? 0;
    const max = slab.maxQty == null ? Infinity : slab.maxQty;
    if (quantity >= min && quantity <= max && slab.price != null) {
      return slab.price;
    }
  }
  return base;
}

module.exports = { resolveUnitPriceFromCityPricing };
