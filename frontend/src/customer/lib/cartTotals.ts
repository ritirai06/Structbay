import type { CartItem } from "../context/AppContext";
import {
  cartLineGstAmount,
  cartLineSubtotalExGst,
  cartLineUnitPrice,
  type CartLineForPricing,
} from "./wholesalePricing";

export type GstDisplayMode = "exclusive" | "inclusive";

export type AppliedCoupon = {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscount: number | null;
  minCartValue: number;
  applicableCategories?: string[];
};

const STORAGE_KEY = "sb_cart_gst_display";

export type CartGstPrefs = {
  mode: GstDisplayMode;
};

export function loadCartGstPrefs(): CartGstPrefs {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "exclusive" };
    const parsed = JSON.parse(raw) as Partial<CartGstPrefs>;
    return { mode: parsed.mode === "inclusive" ? "inclusive" : "exclusive" };
  } catch {
    return { mode: "exclusive" };
  }
}

export function saveCartGstPrefs(prefs: CartGstPrefs) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function lineGstPct(line: Pick<CartItem, "gstPercentage">): number {
  const p = line.gstPercentage;
  return p !== undefined && Number.isFinite(p) && p >= 0 ? p : 18;
}

export function lineGstAmount(line: CartLineForPricing & Pick<CartItem, "gstPercentage">): number {
  return cartLineGstAmount(line, lineGstPct(line));
}

export function lineSubtotalExGst(line: CartLineForPricing): number {
  return cartLineSubtotalExGst(line);
}

export function lineSubtotalInclGst(line: CartLineForPricing & Pick<CartItem, "gstPercentage">): number {
  return lineSubtotalExGst(line) + lineGstAmount(line);
}

export function lineUnitPriceExGst(line: CartLineForPricing): number {
  const price = cartLineUnitPrice(line);
  if (line.gstType === "inclusive") {
    const pct = Number.isFinite(line.gstPercentage) && line.gstPercentage! >= 0 ? line.gstPercentage! : 18;
    return Math.round(price / (1 + pct / 100));
  }
  return price;
}

export function lineUnitPriceInclGst(line: CartLineForPricing & Pick<CartItem, "gstPercentage">): number {
  if (line.qty < 1) return 0;
  return Math.round(lineSubtotalInclGst(line) / line.qty);
}

export type CartLineDisplay = {
  lineTotal: number;
  unitPrice: number;
  priceSuffix: string;
  gstPct: number;
  gstAmount: number;
};

export function formatCartLineDisplay(
  line: CartItem,
  _ignoredMode?: GstDisplayMode // Kept for backwards compatibility but ignored
): CartLineDisplay {
  const gstPct = lineGstPct(line);
  const gstAmount = lineGstAmount(line);
  const exSub = lineSubtotalExGst(line);
  const inclSub = exSub + gstAmount;

  if (line.gstType === "inclusive") {
    return {
      lineTotal: inclSub,
      unitPrice: lineUnitPriceInclGst(line),
      priceSuffix: `incl. ${gstPct}% GST`,
      gstPct,
      gstAmount,
    };
  }

  return {
    lineTotal: exSub,
    unitPrice: lineUnitPriceExGst(line),
    priceSuffix: line.gstType === "exclusive" ? `excl. ${gstPct}% GST` : `+ ${gstPct}% GST`,
    gstPct,
    gstAmount,
  };
}

export type CartSummary = {
  subtotalExGst: number;
  gstAmount: number;
  gstMode: GstDisplayMode;
  discount: number;
  displaySubtotal: number;
  subtotalLabel: string;
  gstLabel: string;
  total: number;
  totalLabel: string;
};

export function buildCartSummaryFromLines(
  lines: CartItem[],
  mode: GstDisplayMode,
  coupons?: AppliedCoupon[] | null
): CartSummary {
  const subtotalExGst = lines.reduce((s, l) => s + lineSubtotalExGst(l), 0);
  
  let totalDiscount = 0;
  if (coupons && coupons.length > 0) {
    for (const coupon of coupons) {
      let applicableSubtotal = 0;
      for (const line of lines) {
        const catId = typeof line.product.category === 'object' ? (line.product.category as any)?._id : line.product.category;
        if (!coupon.applicableCategories || coupon.applicableCategories.length === 0 || (catId && coupon.applicableCategories.includes(catId))) {
          applicableSubtotal += lineSubtotalExGst(line);
        }
      }

      if (applicableSubtotal >= (coupon.minCartValue || 0)) {
        let discountForThisCoupon = 0;
        if (coupon.type === 'PERCENTAGE') {
          discountForThisCoupon = applicableSubtotal * (coupon.discountValue / 100);
          if (coupon.maxDiscount && discountForThisCoupon > coupon.maxDiscount) {
            discountForThisCoupon = coupon.maxDiscount;
          }
        } else {
          discountForThisCoupon = coupon.discountValue;
        }
        
        if (discountForThisCoupon > applicableSubtotal) {
          discountForThisCoupon = applicableSubtotal;
        }
        
        totalDiscount += discountForThisCoupon;
      }
    }

    // Cap total discount to overall subtotal
    if (totalDiscount > subtotalExGst) {
      totalDiscount = subtotalExGst;
    }
  }

  // Calculate GST on original base price per line item (coupon does not reduce GST)
  let gstAmount = 0;
  lines.forEach((l) => {
    const lineExGst = lineSubtotalExGst(l);
    const gstPct = lineGstPct(l);
    gstAmount += (lineExGst * gstPct) / 100;
  });
  gstAmount = Math.round(gstAmount);

  const discountedSubtotal = subtotalExGst - totalDiscount;
  const grandIncl = discountedSubtotal + gstAmount;

  return {
    subtotalExGst,
    gstAmount,
    gstMode: mode,
    discount: Math.round(totalDiscount),
    displaySubtotal: subtotalExGst,
    subtotalLabel: "Product Price (Base)",
    gstLabel: "GST",
    total: Math.round(grandIncl),
    totalLabel: "Total",
  };
}
