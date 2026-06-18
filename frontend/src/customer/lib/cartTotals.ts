import type { CartItem } from "../context/AppContext";
import {
  cartLineGstAmount,
  cartLineSubtotalExGst,
  cartLineUnitPrice,
  type CartLineForPricing,
} from "./wholesalePricing";

export type GstDisplayMode = "exclusive" | "inclusive";

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
  return cartLineUnitPrice(line);
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
  mode: GstDisplayMode
): CartLineDisplay {
  const gstPct = lineGstPct(line);
  const gstAmount = lineGstAmount(line);
  const exSub = lineSubtotalExGst(line);
  const inclSub = exSub + gstAmount;

  if (mode === "inclusive") {
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
    priceSuffix: `ex-GST · ${gstPct}% GST at checkout`,
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
  discount = 0
): CartSummary {
  const subtotalExGst = lines.reduce((s, l) => s + lineSubtotalExGst(l), 0);
  const gstAmount = lines.reduce((s, l) => s + lineGstAmount(l), 0);
  const grandIncl = subtotalExGst + gstAmount;

  if (mode === "inclusive") {
    return {
      subtotalExGst,
      gstAmount,
      gstMode: mode,
      discount,
      displaySubtotal: grandIncl,
      subtotalLabel: "Subtotal (incl. GST)",
      gstLabel: "GST included in subtotal",
      total: grandIncl - discount,
      totalLabel: "Total (incl. GST)",
    };
  }

  return {
    subtotalExGst,
    gstAmount,
    gstMode: mode,
    discount,
    displaySubtotal: subtotalExGst,
    subtotalLabel: "Subtotal (ex-GST)",
    gstLabel: "GST (as per product)",
    total: subtotalExGst + gstAmount - discount,
    totalLabel: "Total (ex-GST + GST)",
  };
}
