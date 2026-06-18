/** Canonical storefront product detail path (matches App router). */
export function productHref(slugOrId: string): string {
  const s = String(slugOrId || "").trim();
  if (!s) return "/shop";
  return `/products/${encodeURIComponent(s)}`;
}
