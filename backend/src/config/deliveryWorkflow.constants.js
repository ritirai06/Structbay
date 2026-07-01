/**
 * PRD: Product delivery types & status hand-offs (S = StructBay, V = Vendor).
 * Used for documentation, admin copy, and future workflow engines.
 */

/** Type A — vendor ships to customer; StructBay coordinates documents & confirmation. */
const VENDOR_DELIVERY_STATUS_FLOW = [
  { key: 'new_order_alert', label: 'New order alert', from: 'S', to: 'V' },
  { key: 'ready_dispatch', label: 'Ready dispatch', from: 'V', to: 'S' },
  { key: 'confirm_dispatch', label: 'Confirm dispatch', from: 'S', to: 'V' },
  { key: 'vendor_invoice_sent', label: 'Vendor invoice sent', from: 'V', to: 'S' },
  { key: 'structbay_invoice_eway', label: 'StructBay invoice & e-way bill sent', from: 'S', to: 'V' },
  { key: 'dispatched', label: 'Dispatched', from: 'V', to: 'S' },
  { key: 'material_delivered', label: 'Material delivered', from: 'V', to: 'S' },
  { key: 'delivery_confirmed', label: 'Delivery confirmed', from: 'S', to: 'V' },
];

/** Type B — same early steps; then vendor invoice + pickup contact; StructBay books logistics & sends docs. */
const STRUCTBAY_DELIVERY_STATUS_FLOW = [
  { key: 'new_order_alert', label: 'New order alert', from: 'S', to: 'V' },
  { key: 'ready_dispatch', label: 'Ready dispatch', from: 'V', to: 'S' },
  { key: 'confirm_dispatch', label: 'Confirm dispatch', from: 'S', to: 'V' },
  { key: 'vendor_invoice_pickup_contact', label: 'Vendor invoice + pickup contact (name & phone)', from: 'V', to: 'S' },
  { key: 'logistics_booked', label: 'Logistics booked (Porter/Delhivery) + invoice & e-way PDFs to vendor', from: 'S', to: 'V' },
  { key: 'pickup_transit_delivery', label: 'Pickup → transit → delivery (track & update customer)', from: 'S', to: 'CUSTOMER' },
];

/** Customer-facing milestones (mapped from master {@link Order} status in customerOrderProgress). */
const CUSTOMER_TRACKING_STEPS = [
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'ORDER_PROCESSING',
  'OUT_FOR_DELIVERY',
  'PARTIAL_DELIVERED',
  'FULL_DELIVERY_COMPLETE',
];

module.exports = {
  VENDOR_DELIVERY_STATUS_FLOW,
  STRUCTBAY_DELIVERY_STATUS_FLOW,
  CUSTOMER_TRACKING_STEPS,
};
