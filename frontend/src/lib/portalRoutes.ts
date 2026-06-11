/**
 * Canonical URL prefixes for the unified SPA (see src/App.tsx).
 * Always use these helpers for in-portal links so navigation never
 * falls through to customer marketplace routes or the `*` fallback.
 */
export const ADMIN_BASE = "/admin";
export const VENDOR_BASE = "/vendor";

function join(base: string, ...segments: string[]): string {
  const flat = segments
    .filter((s) => s != null && s !== "")
    .flatMap((s) => String(s).split("/"))
    .filter(Boolean);
  return [base, ...flat].join("/");
}

/** e.g. adminPath("products") -> "/admin/products", adminPath("products", id, "edit") -> "/admin/products/:id/edit" */
export function adminPath(...segments: string[]): string {
  return join(ADMIN_BASE, ...segments);
}

/** e.g. vendorPath("orders") -> "/vendor/orders", vendorPath("orders", id, "invoice") -> "/vendor/orders/:id/invoice" */
export function vendorPath(...segments: string[]): string {
  return join(VENDOR_BASE, ...segments);
}
