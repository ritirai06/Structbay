import {
  flattenVariationAttributes,
  humanizeAttrKey,
  formatVariationLabel,
} from "./productAttributes";
import type { PricingSnapshot } from "./wholesalePricing";

export type AttributeAxis = { key: string; label: string };

const FALLBACK_AXIS_KEYS = [
  "size",
  "thickness",
  "length",
  "diameter",
  "weight",
  "color",
  "grade",
  "finish",
  "coil size",
  "wire thickness",
];

function normalizeKey(key: string): string {
  return String(key).toLowerCase().trim();
}

function valueSignature(variations: any[], axisKey: string): string {
  return uniqueValuesForAxis(variations, axisKey, {})
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join("\0");
}

export function uniqueValuesForAxis(
  variations: any[],
  axisKey: string,
  partial: Record<string, string>
): string[] {
  const k = axisKey.toLowerCase();
  const vals = new Set<string>();
  for (const v of variations) {
    const rows = flattenVariationAttributes(v?.attributes);
    const matchesPartial = Object.entries(partial).every(([pk, pv]) => {
      if (!pv) return true;
      const row = rows.find((r) => r.key.toLowerCase() === pk.toLowerCase());
      return row?.value === pv;
    });
    if (!matchesPartial) continue;
    const row = rows.find((r) => r.key.toLowerCase() === k);
    if (row?.value) vals.add(row.value);
  }
  return [...vals].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function axesForVariations(
  variations: any[],
  categoryFilters: Array<{ key?: string; label?: string; sortOrder?: number; isActive?: boolean }> | undefined
): AttributeAxis[] {
  if (!variations?.length || variations.length < 2) return [];

  const filterDefs = [...(categoryFilters || [])]
    .filter((f) => f.key && f.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));

  const keysInData = new Set<string>();
  for (const v of variations) {
    for (const r of flattenVariationAttributes(v?.attributes)) {
      keysInData.add(normalizeKey(r.key));
    }
  }

  const ordered: AttributeAxis[] = [];
  const seen = new Set<string>();

  const pushAxis = (rawKey: string, preferredLabel?: string) => {
    const key = normalizeKey(rawKey);
    if (seen.has(key)) return;
    const vals = uniqueValuesForAxis(variations, key, {});
    const fromCategory = filterDefs.some((f) => normalizeKey(String(f.key)) === key);
    const minOptions = fromCategory ? 1 : 2;
    if (vals.length < minOptions) return;
    const sig = valueSignature(variations, key);
    if (ordered.some((existing) => valueSignature(variations, existing.key) === sig)) return;
    const def = filterDefs.find((f) => normalizeKey(String(f.key)) === key);
    ordered.push({
      key,
      label: def?.label || preferredLabel || humanizeAttrKey(key),
    });
    seen.add(key);
  };

  for (const f of filterDefs) {
    pushAxis(String(f.key), f.label);
  }
  // When category defines filters, stick to those — avoids duplicate axes (e.g. size + length).
  if (!filterDefs.length) {
    for (const k of keysInData) {
      pushAxis(k);
    }
    for (const k of FALLBACK_AXIS_KEYS) {
      if ([...keysInData].some((x) => x === k || x.replace(/\s+/g, "") === k.replace(/\s+/g, ""))) {
        pushAxis(k);
      }
    }
  }

  return ordered;
}

export function initSelectionsForVariation(
  variation: any | null | undefined,
  axes: AttributeAxis[]
): Record<string, string> {
  const rows = flattenVariationAttributes(variation?.attributes);
  const out: Record<string, string> = {};
  for (const axis of axes) {
    const row = rows.find((r) => r.key.toLowerCase() === axis.key.toLowerCase());
    if (row?.value) out[axis.key] = row.value;
  }
  return out;
}

export function resolveVariationFromSelections(variations: any[], selections: Record<string, string>): any | null {
  if (!variations.length) return null;
  const active = Object.entries(selections).filter(([, v]) => v);
  if (!active.length) return variations[0];

  const exact = variations.find((v) => {
    const rows = flattenVariationAttributes(v?.attributes);
    return active.every(([key, val]) => {
      const row = rows.find((r) => r.key.toLowerCase() === key.toLowerCase());
      return row?.value === val;
    });
  });
  if (exact) return exact;

  let best = variations[0];
  let bestScore = -1;
  for (const v of variations) {
    const rows = flattenVariationAttributes(v?.attributes);
    let score = 0;
    for (const [key, val] of active) {
      const row = rows.find((r) => r.key.toLowerCase() === key.toLowerCase());
      if (row?.value === val) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

export function variationOptionLabel(v: any, price: number): string {
  const label = formatVariationLabel(v);
  return `${label} — ₹${price.toLocaleString("en-IN")}`;
}

export function lowestBulkSlabPrice(snap: PricingSnapshot | null | undefined): number | null {
  if (!snap?.wholesaleSlabs?.length) return null;
  const prices = snap.wholesaleSlabs.map((s) => s.price).filter((p) => Number.isFinite(p));
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function firstBulkSlabMinQty(snap: PricingSnapshot | null | undefined): number | null {
  if (!snap?.wholesaleSlabs?.length) return null;
  const sorted = [...snap.wholesaleSlabs].sort((a, b) => a.minQty - b.minQty);
  const min = sorted[0]?.minQty;
  return Number.isFinite(min) && min > 0 ? min : null;
}
