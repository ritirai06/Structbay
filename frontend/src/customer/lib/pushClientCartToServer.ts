import type { CartItem } from "../context/AppContext";
import { api } from "./api";

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
    await api.addToCart({
      productId: product._id,
      variationId: item.variationId || undefined,
      quantity: item.qty,
      cityId,
    });
  }
}
