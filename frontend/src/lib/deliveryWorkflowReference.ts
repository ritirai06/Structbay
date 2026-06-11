/** PRD copy for admin/customer UI — keep aligned with `backend/src/config/deliveryWorkflow.constants.js`. */

export type FlowRow = { label: string; handoff: string };

export const VENDOR_DELIVERY_FLOW: FlowRow[] = [
  { label: "New order alert", handoff: "StructBay → Vendor" },
  { label: "Ready dispatch", handoff: "Vendor → StructBay" },
  { label: "Confirm dispatch", handoff: "StructBay → Vendor" },
  { label: "Vendor invoice sent", handoff: "Vendor → StructBay" },
  { label: "StructBay invoice & e-way bill sent", handoff: "StructBay → Vendor" },
  { label: "Dispatched", handoff: "Vendor → StructBay" },
  { label: "Material delivered", handoff: "Vendor → StructBay" },
  { label: "Delivery confirmed", handoff: "StructBay → Vendor" },
];

export const STRUCTBAY_DELIVERY_FLOW: FlowRow[] = [
  { label: "New order alert", handoff: "StructBay → Vendor" },
  { label: "Ready dispatch", handoff: "Vendor → StructBay" },
  { label: "Confirm dispatch", handoff: "StructBay → Vendor" },
  { label: "Vendor invoice + pickup contact (name & phone)", handoff: "Vendor → StructBay" },
  {
    label: "Admin books Porter/Delhivery; sends invoice & e-way PDFs; fills pickup time, company, driver contact",
    handoff: "StructBay → Vendor",
  },
  { label: "Pickup → transit → delivery (track & update customer)", handoff: "StructBay → Customer" },
];

export const CUSTOMER_MILESTONE_LABELS = [
  "Order placed",
  "Order processing",
  "Out for delivery",
  "Partial delivered",
  "Full delivery complete",
] as const;

export const STRUCTBAY_ASSURED_BLURB =
  "StructBay Assured: admin marks trusted products (quality-backed). Badge on shop, category, product, and search tiles.";

export const STRUCTBAY_EXPRESS_BLURB =
  "StructBay Express: same-day / priority delivery on selected products. Badge on shop, product, and search; Express sorts first in category.";
