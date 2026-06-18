export type WholesaleSlab = {
  minQty: number;
  maxQty: number | null;
  price: number;
};

export type CityPricingConfig = {
  sellingPrice: number | "";
  mrp: number | "";
  purchaseCost: number | "";
  deliveryCharge: number | "";
  taxPercentage: number | "";
  isAvailable: boolean;
  wholesaleSlabs: WholesaleSlab[];
};

export type CityInventoryConfig = {
  quantity: number | "";
  reserved: number | "";
  reorderLevel: number | "";
  safetyStock: number | "";
};

export type CityConfig = {
  cityId: string;
  cityName: string;
  expanded: boolean;
  pricing: CityPricingConfig;
  inventory: CityInventoryConfig;
};

export type ActiveCity = { _id: string; name: string; slug?: string };

export const emptyPricing = (defaultTax = 18): CityPricingConfig => ({
  sellingPrice: "",
  mrp: "",
  purchaseCost: "",
  deliveryCharge: "",
  taxPercentage: defaultTax,
  isAvailable: true,
  wholesaleSlabs: [],
});

export const emptyInventory = (): CityInventoryConfig => ({
  quantity: "",
  reserved: 0,
  reorderLevel: 50,
  safetyStock: 0,
});

export function buildCityConfigsFromApi(
  cities: ActiveCity[],
  cityConfigs?: Array<{
    city?: { _id: string; name: string };
    pricing?: {
      sellingPrice?: number;
      mrp?: number;
      purchaseCost?: number | null;
      deliveryCharge?: number;
      taxPercentage?: number | null;
      isAvailable?: boolean;
      wholesaleSlabs?: WholesaleSlab[];
    } | null;
    inventory?: {
      quantity?: number;
      reserved?: number;
      reorderLevel?: number;
      safetyStock?: number;
    } | null;
  }>,
  defaultTax = 18
): CityConfig[] {
  const byCity = new Map(
    (cityConfigs || []).map((c) => [String(c.city?._id), c])
  );

  return cities.map((city, idx) => {
    const existing = byCity.get(String(city._id));
    const pricing = existing?.pricing;
    const inv = existing?.inventory;

    return {
      cityId: city._id,
      cityName: city.name,
      expanded: idx === 0,
      pricing: {
        sellingPrice: pricing?.sellingPrice ?? "",
        mrp: pricing?.mrp ?? "",
        purchaseCost: pricing?.purchaseCost ?? "",
        deliveryCharge: pricing?.deliveryCharge ?? "",
        taxPercentage: pricing?.taxPercentage ?? defaultTax,
        isAvailable: pricing?.isAvailable !== false,
        wholesaleSlabs: (pricing?.wholesaleSlabs || []).map((s) => ({
          minQty: s.minQty,
          maxQty: s.maxQty ?? null,
          price: s.price,
        })),
      },
      inventory: {
        quantity: inv?.quantity ?? "",
        reserved: inv?.reserved ?? 0,
        reorderLevel: inv?.reorderLevel ?? 50,
        safetyStock: inv?.safetyStock ?? 0,
      },
    };
  });
}

export function computeStockStatus(qty: number, reorder: number): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" {
  if (qty === 0) return "OUT_OF_STOCK";
  if (qty <= reorder) return "LOW_STOCK";
  return "IN_STOCK";
}

export function stockStatusLabel(status: string) {
  if (status === "OUT_OF_STOCK") return "Out Of Stock";
  if (status === "LOW_STOCK") return "Low Stock";
  return "In Stock";
}

export function validateCityConfigs(configs: CityConfig[]): string | null {
  for (const cfg of configs) {
    const hasPricing =
      cfg.pricing.isAvailable &&
      cfg.pricing.sellingPrice !== "" &&
      Number(cfg.pricing.sellingPrice) >= 0;

    if (hasPricing) {
      const sp = Number(cfg.pricing.sellingPrice);
      const mrp = cfg.pricing.mrp !== "" ? Number(cfg.pricing.mrp) : sp;
      if (Number.isFinite(mrp) && mrp < sp) {
        return `${cfg.cityName}: MRP cannot be less than selling price.`;
      }
    }

    const qty = cfg.inventory.quantity !== "" ? Number(cfg.inventory.quantity) : 0;
    const reserved = cfg.inventory.reserved !== "" ? Number(cfg.inventory.reserved) : 0;
    if (reserved > qty) {
      return `${cfg.cityName}: Reserved stock cannot exceed available stock.`;
    }

    for (const slab of cfg.pricing.wholesaleSlabs) {
      if (slab.minQty < 0 || slab.price < 0) {
        return `${cfg.cityName}: Invalid wholesale slab values.`;
      }
      if (slab.maxQty != null && slab.maxQty < slab.minQty) {
        return `${cfg.cityName}: Wholesale slab max qty must be ≥ min qty.`;
      }
    }
  }
  return null;
}

export function cityConfigsToPayload(configs: CityConfig[]) {
  const cityPricing = configs
    .filter((c) => c.pricing.sellingPrice !== "" && Number(c.pricing.sellingPrice) >= 0)
    .map((c) => ({
      city: c.cityId,
      sellingPrice: Number(c.pricing.sellingPrice),
      mrp: c.pricing.mrp !== "" ? Number(c.pricing.mrp) : Number(c.pricing.sellingPrice),
      purchaseCost: c.pricing.purchaseCost !== "" ? Number(c.pricing.purchaseCost) : null,
      deliveryCharge: c.pricing.deliveryCharge !== "" ? Number(c.pricing.deliveryCharge) : 0,
      taxPercentage: c.pricing.taxPercentage !== "" ? Number(c.pricing.taxPercentage) : null,
      isAvailable: c.pricing.isAvailable,
      wholesaleSlabs: c.pricing.wholesaleSlabs,
    }));

  const inventory = configs
    .filter((c) => c.inventory.quantity !== "" && Number(c.inventory.quantity) >= 0)
    .map((c) => ({
      city: c.cityId,
      quantity: Number(c.inventory.quantity),
      reserved: c.inventory.reserved !== "" ? Number(c.inventory.reserved) : 0,
      reorderLevel: c.inventory.reorderLevel !== "" ? Number(c.inventory.reorderLevel) : 50,
      safetyStock: c.inventory.safetyStock !== "" ? Number(c.inventory.safetyStock) : 0,
    }));

  return { cityPricing, inventory };
}
