/** Canonical attribute values — keep in sync with backend attributeValueNormalize.js */

export function collapseWhitespace(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function canonicalAttributeValue(value: unknown, key = ""): string {
  let s = collapseWhitespace(value);
  if (!s) return "";

  const k = key.toLowerCase();
  const numericUnit = s.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?$/);
  if (numericUnit) {
    const num = numericUnit[1];
    let unit = (numericUnit[2] || "").toUpperCase();
    if (!unit && (k === "weight" || k === "size")) unit = "KG";
    if (unit === "KGS") unit = "KG";
    if (unit) return `${num} ${unit}`;
    return num;
  }

  return s;
}

export function attributeValuesEquivalent(a: unknown, b: unknown, key = ""): boolean {
  const ca = canonicalAttributeValue(a, key).toLowerCase();
  const cb = canonicalAttributeValue(b, key).toLowerCase();
  return ca.length > 0 && ca === cb;
}

export function dedupeAttributeValues(values: string[], key = ""): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const display = collapseWhitespace(raw);
    if (!display) continue;
    const canon = canonicalAttributeValue(display, key).toLowerCase();
    if (!seen.has(canon)) {
      seen.set(canon, canonicalAttributeValue(display, key));
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
