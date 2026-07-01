/** PRD copy for admin/customer UI — keep aligned with `backend/src/config/deliveryWorkflow.constants.js`. */

export type FlowRow = { label: string; handoff: string };

export const VENDOR_DELIVERY_FLOW: FlowRow[] = [
  { label: "New order alert", handoff: "Structbay → Vendor" },
  { label: "Ready dispatch", handoff: "Vendor → Structbay" },
  { label: "Confirm dispatch", handoff: "Structbay → Vendor" },
  { label: "Vendor invoice sent", handoff: "Vendor → Structbay" },
  { label: "Structbay invoice & e-way bill sent", handoff: "Structbay → Vendor" },
  { label: "Dispatched", handoff: "Vendor → Structbay" },
  { label: "Material delivered", handoff: "Vendor → Structbay" },
  { label: "Delivery confirmed", handoff: "Structbay → Vendor" },
];

export const Structbay_DELIVERY_FLOW: FlowRow[] = [
  { label: "New order alert", handoff: "Structbay → Vendor" },
  { label: "Ready dispatch", handoff: "Vendor → Structbay" },
  { label: "Confirm dispatch", handoff: "Structbay → Vendor" },
  { label: "Vendor invoice + pickup contact (name & phone)", handoff: "Vendor → Structbay" },
  {
    label: "Admin books Porter/Delhivery; sends invoice & e-way PDFs; fills pickup time, company, driver contact",
    handoff: "Structbay → Vendor",
  },
  { label: "Pickup → transit → delivery (track & update customer)", handoff: "Structbay → Customer" },
];

export const CUSTOMER_MILESTONE_LABELS = [
  "Order placed",
  "Order confirmed",
  "Processing",
  "Out for delivery",
  "Partial delivered",
  "Full delivery complete",
] as const;

export const Structbay_ASSURED_BLURB =
  "Structbay Assured: admin marks trusted products (quality-backed). Badge on shop, category, product, and search tiles.";

export const Structbay_EXPRESS_BLURB =
  "Structbay Express: same-day / priority delivery on selected products. Badge on shop, product, and search; Express sorts first in category.";
