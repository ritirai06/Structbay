import { getApiV1Base } from "../../lib/apiBase";

/** Plain-text example — keep in sync with backend `bulkEnquiryTemplate.js`. */
export const BULK_ENQUIRY_TEXT_EXAMPLE = [
  "Ultratech Cement OPC 53 Grade — 500 bags",
  "Asian Paints Apex Ultima — 120 buckets",
  "TMT Steel Bar (Fe 500D · 12 mm) — 8 MT",
  "River Sand — 45 MT",
].join("\n");

export function bulkEnquiryTemplateDownloadUrl(format: "excel" | "pdf"): string {
  const base = getApiV1Base().replace(/\/$/, "");
  return `${base}/bulk-enquiries/template/${format}`;
}

export function downloadBulkEnquiryTemplate(format: "excel" | "pdf") {
  const url = bulkEnquiryTemplateDownloadUrl(format);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    format === "excel"
      ? "structbay-bulk-enquiry-template.xlsx"
      : "structbay-bulk-enquiry-template.pdf";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
