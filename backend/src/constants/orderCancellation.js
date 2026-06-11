/**
 * Master-order statuses where the customer must not cancel (dispatch journey started or finished).
 * PRD: cancel before "out for delivery"; after dispatch, cancellation not allowed (contact support).
 * Also enforced via Shipment state in cancel handlers when shipments exist.
 */
const CUSTOMER_NON_CANCELLABLE_MASTER_ORDER_STATUSES = [
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

module.exports = { CUSTOMER_NON_CANCELLABLE_MASTER_ORDER_STATUSES };
