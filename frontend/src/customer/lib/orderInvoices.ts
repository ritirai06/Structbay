import { api } from "./api";

function triggerBlobDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function safeName(orderNumber: string | undefined, orderId: string, suffix: string) {
  const base = (orderNumber || orderId).replace(/[^\w.-]+/g, "_");
  return `StructBay-${base}${suffix}`;
}

/** Download uploaded invoices via API proxy, or generated PDF with logo. */
export async function openOrderInvoices(orderId: string, orderNumber?: string): Promise<void> {
  if (!orderId?.trim()) {
    throw new Error("Missing order id.");
  }

  try {
    const res = await api.getOrderInvoices(orderId);
    const list = (res as { data?: { label?: string; index?: number }[] }).data || [];
    if (list.length) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const idx = typeof item.index === "number" ? item.index : i;
        const blob = await api.downloadOrderInvoiceFile(orderId, idx);
        const label = (item.label || "invoice").replace(/[^\w.-]+/g, "_").slice(0, 40);
        triggerBlobDownload(blob, safeName(orderNumber, orderId, `-${label}.pdf`));
      }
      return;
    }

    const blob = await api.downloadOrderInvoicePdf(orderId);
    triggerBlobDownload(blob, safeName(orderNumber, orderId, ".pdf"));
  } catch {
    try {
      const blob = await api.downloadOrderInvoiceSummaryHtml(orderId);
      triggerBlobDownload(blob, safeName(orderNumber, orderId, ".html"));
    } catch (e) {
      throw e instanceof Error ? e : new Error("Could not load invoices.");
    }
  }
}
