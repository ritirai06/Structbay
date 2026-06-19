export type ProductStructure = "simple" | "variant";

/** Mirror backend resolveProductStructure for storefront branching. */
export function resolveProductStructure(
  product: { productStructure?: string; variations?: unknown[] } | null | undefined
): ProductStructure {
  const explicit = product?.productStructure;
  if (explicit === "variant") return "variant";
  const vars = product?.variations;
  if (Array.isArray(vars) && vars.length > 0) return "variant";
  if (explicit === "simple") return "simple";
  return "simple";
}

export function isVariantProduct(
  product: { productStructure?: string; variations?: unknown[] } | null | undefined
): boolean {
  return resolveProductStructure(product) === "variant";
}

export function validateCartLine(
  product: { name?: string; productStructure?: string; variations?: unknown[] },
  variationId?: string | null
): { ok: true } | { ok: false; message: string } {
  const structure = resolveProductStructure(product);
  const name = product.name || "This product";

  if (structure === "variant") {
    const vars = product.variations;
    if (!Array.isArray(vars) || vars.length === 0) {
      return { ok: false, message: `${name} has no variants configured yet.` };
    }
    if (!variationId) {
      return { ok: false, message: `${name} requires a variant selection.` };
    }
    const hit = vars.some((v: { _id?: string }) => String(v?._id) === String(variationId));
    if (!hit) {
      return { ok: false, message: `Selected variant is no longer available for ${name}.` };
    }
    return { ok: true };
  }

  if (variationId) {
    return { ok: false, message: `${name} is a simple product and does not use variants.` };
  }
  return { ok: true };
}
