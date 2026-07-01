/**
 * Maps internal master-order status to PRD-style customer-facing steps.
 */
const STATUS_TO_CUSTOMER = {
  PENDING: { step: 'order_placed', label: 'Order placed' },
  PAID: { step: 'order_confirmed', label: 'Order confirmed' },
  VENDOR_ASSIGNMENT_PENDING: { step: 'order_confirmed', label: 'Order confirmed' },
  PROCESSING: { step: 'order_processing', label: 'Processing' },
  READY_FOR_DISPATCH: { step: 'order_processing', label: 'Processing' },
  PARTIALLY_DISPATCHED: { step: 'out_for_delivery', label: 'Out for delivery' },
  DISPATCHED: { step: 'out_for_delivery', label: 'Out for delivery' },
  PARTIALLY_DELIVERED: { step: 'partial_delivered', label: 'Partial delivered' },
  DELIVERED: { step: 'full_delivery', label: 'Full delivery complete' },
  COMPLETED: { step: 'full_delivery', label: 'Full delivery complete' },
  CANCELLED: { step: 'cancelled', label: 'Cancelled' },
  RETURNED: { step: 'returned', label: 'Returned' },
};

function customerOrderProgress(order) {
  const status = order?.status;
  const mapped = STATUS_TO_CUSTOMER[status] || { step: 'order_processing', label: 'Order processing' };
  return {
    customerStep: mapped.step,
    customerStatusLabel: mapped.label,
    internalStatus: status,
    /** Shown to customer on tracking; admin-only internal notes stay in adminNotes. */
    detailedDeliveryNotes: order?.deliveryDetails || null,
  };
}

module.exports = { customerOrderProgress, STATUS_TO_CUSTOMER };
