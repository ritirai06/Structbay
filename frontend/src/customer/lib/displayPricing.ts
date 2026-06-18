/** Customer-facing price display — driven by admin `priceIncludesGst` on each product. */

export function productGstPct(product: { gstPercentage?: unknown } | null | undefined): number {
  return Math.min(100, Math.max(0, Number(product?.gstPercentage) || 18));
}

export function productPriceIncludesGst(product: { priceIncludesGst?: boolean } | null | undefined): boolean {
  return !!product?.priceIncludesGst;
}

/** Stored city prices are ex-GST; convert for display when product is flagged incl-GST. */
export function displayUnitFromExGst(
  unitEx: number,
  product: { priceIncludesGst?: boolean; gstPercentage?: unknown } | null | undefined
): number {
  if (!Number.isFinite(unitEx) || unitEx <= 0) return 0;
  if (productPriceIncludesGst(product)) {
    return Math.round(unitEx * (1 + productGstPct(product) / 100));
  }
  return unitEx;
}

export function displayPriceMeta(
  product: { unit?: string; priceIncludesGst?: boolean; gstPercentage?: unknown } | null | undefined,
  extra?: string
): string {
  const unit = product?.unit || "unit";
  const pct = productGstPct(product);
  const gstPart = productPriceIncludesGst(product) ? `incl. ${pct}% GST` : "excl. GST";
  const base = `per ${unit} · ${gstPart}`;
  return extra ? `${base} · ${extra}` : base;
}
