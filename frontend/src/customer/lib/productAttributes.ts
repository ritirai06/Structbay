/**
 * Normalize variation `attributes` (fixed keys + custom[]) for display and filtering.
 * Mirrors backend ProductVariation + CategoryFilter conventions.
 */

export function humanizeAttrKey(key: string): string {
  return String(key)
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export type AttributeRow = { key: string; label: string; value: string };

const FIXED_KEYS = ["weight", "grade", "size", "thickness", "length", "color", "finish", "diameter"] as const;

export function flattenVariationAttributes(attrs: Record<string, unknown> | null | undefined): AttributeRow[] {
  const rows: AttributeRow[] = [];
  if (!attrs || typeof attrs !== "object") return rows;
  const a = attrs as Record<string, unknown>;
  for (const k of FIXED_KEYS) {
    const v = a[k];
    if (v != null && String(v).trim()) rows.push({ key: k, label: humanizeAttrKey(k), value: String(v).trim() });
  }
  const custom = a.custom;
  if (Array.isArray(custom)) {
    for (const c of custom) {
      const row = c as { key?: string; value?: unknown };
      if (row?.key && row.value != null && String(row.value).trim()) {
        const key = String(row.key).trim();
        rows.push({ key, label: humanizeAttrKey(key), value: String(row.value).trim() });
      }
    }
  }
  return rows;
}

export function formatVariationLabel(v: { attributes?: Record<string, unknown> } | null | undefined): string {
  const rows = flattenVariationAttributes(v?.attributes);
  if (!rows.length) return "Option";
  return rows.map((r) => r.value).join(" · ");
}

export function topAttributeChipsForListing(
  v: { attributes?: Record<string, unknown> } | null | undefined,
  categoryFilters: Array<{ key?: string; sortOrder?: number }> | undefined,
  max = 5
): { label: string; value: string }[] {
  const rows = flattenVariationAttributes(v?.attributes);
  const order = [...(categoryFilters || [])]
    .filter((f) => f.key)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((f) => String(f.key).toLowerCase());
  const used = new Set<string>();
  const out: { label: string; value: string }[] = [];
  for (const k of order) {
    const row = rows.find((r) => r.key.toLowerCase() === k);
    if (row && out.length < max) {
      out.push({ label: row.label, value: row.value });
      used.add(row.key.toLowerCase());
    }
  }
  for (const row of rows) {
    if (out.length >= max) break;
    if (!used.has(row.key.toLowerCase())) {
      out.push({ label: row.label, value: row.value });
      used.add(row.key.toLowerCase());
    }
  }
  return out.slice(0, max);
}

export function firstImageUrl(images: unknown): string | undefined {
  if (!images) return undefined;
  if (Array.isArray(images) && images.length) {
    const first = images[0] as { url?: string } | string;
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && first.url) return String(first.url);
  }
  return undefined;
}

/** Order spec rows to match admin CategoryFilter sort (remaining keys follow). */
export function sortSpecsByCategoryFilterOrder(
  rows: AttributeRow[],
  categoryFilters: Array<{ key?: string; sortOrder?: number }> | undefined
): AttributeRow[] {
  const order = [...(categoryFilters || [])]
    .filter((f) => f.key)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((f) => String(f.key).toLowerCase());
  const used = new Set<string>();
  const out: AttributeRow[] = [];
  for (const k of order) {
    const row = rows.find((r) => r.key.toLowerCase() === k);
    if (row) {
      out.push(row);
      used.add(row.key.toLowerCase());
    }
  }
  for (const row of rows) {
    if (!used.has(row.key.toLowerCase())) out.push(row);
  }
  return out;
}
