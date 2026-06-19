import type { CartItem } from "../context/AppContext";
import { api } from "./api";
import { validateCartLine, isVariantProduct } from "./productStructure";
import { listingUnitPrice } from "./wholesalePricing";

/** Resolve slug used on product URLs from a client cart line. */
export function cartItemProductSlug(item: CartItem): string | null {
  if (item.productSlug?.trim()) return item.productSlug.trim();
  const id = item.id || "";
  if (id.includes("::")) return id.split("::")[0]?.trim() || null;
  return id.trim() || null;
}

/**
 * Rebuild the server-side cart from the in-memory customer cart (used at checkout).
 * Caller should `clearCart` and set cart city before calling this.
 */
export async function pushClientCartToServer(cart: CartItem[], cityId: string) {
  for (const item of cart) {
    const slug = cartItemProductSlug(item);
    if (!slug) {
      throw new Error(
        "A cart item is missing a product reference. Remove it and add the product again from the shop."
      );
    }
    const res = await api.getProductDetails(slug, cityId);
    const product = res?.data;
    if (!product?._id) {
      throw new Error(`Product not found or unavailable: ${slug}`);
    }

    const check = validateCartLine(product, item.variationId);
    if (!check.ok) {
      throw new Error(check.message);
    }

    const variationId = isVariantProduct(product) ? item.variationId || undefined : undefined;

    await api.addToCart({
      productId: product._id,
      variationId,
      quantity: item.qty,
      cityId,
    });
  }
}

/** Best-effort unit price for homepage/brand cards from enriched listing payload. */
export function listingCardUnitPrice(product: {
  productStructure?: string;
  pricing?: { salePrice?: number; regularPrice?: number };
  variationPricing?: Array<{ salePrice?: number; regularPrice?: number }>;
  variations?: unknown[];
}): number {
  return listingUnitPrice(product, null);
}
