/** City-scoped stock display for simple products and per-variant rows. */

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNPRICED" | "UNKNOWN";

export type AvailabilityInfo = {
  inStock: boolean;
  stockStatus: StockStatus;
  label: string;
  shortLabel: string;
  availableQty: number | null;
  canAddToCart: boolean;
};

type StockLine = {
  inStock?: boolean;
  stockStatus?: string;
  availableStock?: number;
};

export function resolveAvailability(
  line: StockLine | null | undefined,
  hasPrice: boolean,
  unpricedLabel?: string
): AvailabilityInfo {
  if (!hasPrice) {
    return {
      inStock: false,
      stockStatus: "UNPRICED",
      label: unpricedLabel || "Pricing not available in your city",
      shortLabel: unpricedLabel ? "City mismatch" : "No pricing",
      availableQty: null,
      canAddToCart: false,
    };
  }

  const availableQty =
    typeof line?.availableStock === "number" && Number.isFinite(line.availableStock)
      ? Math.max(0, line.availableStock)
      : null;

  if (line?.inStock === false || availableQty === 0) {
    return {
      inStock: false,
      stockStatus: "OUT_OF_STOCK",
      label: "Out of stock in your city",
      shortLabel: "Out of stock",
      availableQty: availableQty ?? 0,
      canAddToCart: false,
    };
  }

  const status = String(line?.stockStatus || "").toUpperCase();
  if (status === "LOW_STOCK") {
    return {
      inStock: true,
      stockStatus: "LOW_STOCK",
      label: "Low stock",
      shortLabel: "Low stock",
      availableQty,
      canAddToCart: true,
    };
  }

  if (line?.inStock === true) {
    return {
      inStock: true,
      stockStatus: "IN_STOCK",
      label: "In stock",
      shortLabel: "In stock",
      availableQty,
      canAddToCart: true,
    };
  }

  return {
    inStock: true,
    stockStatus: "UNKNOWN",
    label: "Available to order",
    shortLabel: "Available",
    availableQty,
    canAddToCart: true,
  };
}

export function availabilityForProduct(
  product: {
    inStock?: boolean;
    stockStatus?: string;
    availableStock?: number;
    productStructure?: string;
    variations?: Array<StockLine & { _id?: unknown; pricing?: unknown }>;
    variationPricing?: unknown[];
  } | null | undefined,
  variationId: string | null,
  hasPrice: boolean
): AvailabilityInfo {
  if (!product) {
    return resolveAvailability(null, false);
  }

  const isVariant =
    product.productStructure === "variant" ||
    (Array.isArray(product.variations) && product.variations.length > 0);

  const missingCityPricing =
    isVariant &&
    !hasPrice &&
    !(product.variationPricing?.length) &&
    !(product.variations || []).some((v) => v?.pricing);
  const unpricedLabel = missingCityPricing
    ? "Re-select your delivery city to load pricing"
    : undefined;

  if (isVariant && variationId) {
    const v = (product.variations || []).find((x) => String(x._id) === variationId);
    return resolveAvailability(v, hasPrice, unpricedLabel);
  }

  if (isVariant && product.variations?.length) {
    const anyInStock = product.variations.some((v) => v.inStock !== false);
    if (!hasPrice) return resolveAvailability(null, false, unpricedLabel);
    if (!anyInStock) {
      return resolveAvailability({ inStock: false, availableStock: 0 }, true);
    }
    return resolveAvailability(product.variations.find((v) => v.inStock) || product.variations[0], true);
  }

  return resolveAvailability(
    {
      inStock: product.inStock,
      stockStatus: product.stockStatus,
      availableStock: product.availableStock,
    },
    hasPrice
  );
}

export function availabilityCssModifier(status: StockStatus): string {
  if (status === "IN_STOCK") return "in";
  if (status === "LOW_STOCK") return "low";
  if (status === "OUT_OF_STOCK") return "out";
  return "unknown";
}
