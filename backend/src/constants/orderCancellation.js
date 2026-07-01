/**
 * Customer self-service cancellation — PRD: only before Ready for Dispatch.
 * Once vendor marks ready (or master order reaches READY_FOR_DISPATCH+), customer must contact support.
 */

/** Master-order statuses where customer may still cancel. */
const CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'VENDOR_ASSIGNMENT_PENDING',
];

/** Master-order statuses that always block cancellation (dispatch / terminal). */
const CUSTOMER_NON_CANCELLABLE_MASTER_ORDER_STATUSES = [
  'PROCESSING',
  'READY_FOR_DISPATCH',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
];

/**
 * Vendor sub-order statuses that mean fulfilment has reached (or passed) ready-for-dispatch.
 * Blocks customer cancel even if master order is still PROCESSING.
 */
const VENDOR_ORDER_STATUSES_BLOCKING_CUSTOMER_CANCEL = [
  'READY_FOR_DISPATCH',
  'CHANGES_REQUESTED',
  'DISPATCH_APPROVED',
  'VENDOR_INVOICE_SUBMITTED',
  'SB_INVOICE_SENT',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
  'DISPATCH_CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
];

module.exports = {
  CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES,
  CUSTOMER_NON_CANCELLABLE_MASTER_ORDER_STATUSES,
  VENDOR_ORDER_STATUSES_BLOCKING_CUSTOMER_CANCEL,
};
