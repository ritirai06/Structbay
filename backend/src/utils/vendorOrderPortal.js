/**
 * Vendor portal UI historically expected `assignedProducts` and `customer`;
 * VendorOrder schema uses `items` and `customerInfo`. Normalize for API responses.
 */
function decorateVendorOrderForPortal(doc) {
  if (!doc) return doc;
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  if ((!o.assignedProducts || o.assignedProducts.length === 0) && Array.isArray(o.items) && o.items.length) {
    o.assignedProducts = o.items.map((it) => ({
      productName: it.productName || (it.product && it.product.name) || '—',
      quantity: it.quantity,
      unit: '',
      product: it.product,
    }));
  }
  if (!o.customer && o.customerInfo) {
    o.customer = { name: o.customerInfo.name, phone: o.customerInfo.phone };
  }
  if (Number(o.workflowVersion) === 2) {
    o.pendingVendorAction = pendingVendorAction(o.status, o.deliveryType);
    o.workflowTimeline = WORKFLOW_TIMELINE_STEPS;
    o.customerMilestone = customerMilestoneFromVendorStatus(o.status);
  }
  return o;
}

const WORKFLOW_TIMELINE_STEPS = [
  'NEW_ASSIGNED',
  'ACCEPTED',
  'READY_FOR_DISPATCH',
  'DISPATCH_APPROVED',
  'VENDOR_INVOICE_SUBMITTED',
  'SB_INVOICE_SENT',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
];

function customerMilestoneFromVendorStatus(status) {
  const s = String(status || '');
  if (s === 'CANCELLED' || s === 'RETURNED') return 'Order Placed';
  const processing = new Set([
    'NEW_ASSIGNED',
    'ASSIGNED',
    'ACCEPTED',
    'REJECTED',
    'READY_FOR_DISPATCH',
    'CHANGES_REQUESTED',
    'DISPATCH_APPROVED',
    'VENDOR_INVOICE_SUBMITTED',
    'SB_INVOICE_SENT',
    'INVOICE_UPLOADED',
    'DISPATCH_CONFIRMED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
  ]);
  const out = new Set(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'PARTIALLY_DISPATCHED']);
  const delivered = new Set(['DELIVERED', 'PARTIALLY_DELIVERED']);
  const completed = new Set(['COMPLETED']);
  if (completed.has(s)) return 'Completed';
  if (delivered.has(s)) return 'Delivered';
  if (out.has(s)) return 'Out For Delivery';
  if (processing.has(s)) return 'Processing';
  return 'Order Placed';
}

const M_RANK = {
  'Order Placed': 0,
  Processing: 1,
  'Out For Delivery': 2,
  Delivered: 3,
  Completed: 4,
};

function aggregateCustomerMilestone(vendorOrders) {
  if (!vendorOrders || !vendorOrders.length) return 'Order Placed';
  let max = 0;
  let label = 'Order Placed';
  for (const vo of vendorOrders) {
    const onlyV2 = Number(vo.workflowVersion) === 2;
    const m = onlyV2 ? customerMilestoneFromVendorStatus(vo.status) : customerMilestoneFromVendorStatus(vo.status);
    const r = M_RANK[m] ?? 0;
    if (r > max) {
      max = r;
      label = m;
    }
  }
  return label;
}

function pendingVendorAction(status, deliveryType) {
  const typeB = deliveryType === 'structbay_delivery';
  switch (status) {
    case 'NEW_ASSIGNED':
    case 'ASSIGNED':
      return 'Accept or reject this order';
    case 'ACCEPTED':
    case 'CHANGES_REQUESTED':
      return 'Upload packing details, optional invoice, estimated dispatch date, then submit Ready for dispatch';
    case 'READY_FOR_DISPATCH':
      return 'Awaiting StructBay dispatch approval';
    case 'DISPATCH_APPROVED':
      return typeB
        ? 'Upload final tax invoice (PDF) and pickup contact (name & phone) for StructBay pickup'
        : 'Upload final tax invoice (PDF)';
    case 'VENDOR_INVOICE_SUBMITTED':
      return 'Awaiting StructBay invoice and e-way bill';
    case 'SB_INVOICE_SENT':
      return typeB
        ? 'StructBay will book Porter/Delhivery and deliver to the customer — no vendor dispatch needed'
        : 'Mark dispatched with transporter / LR / proof';
    case 'DISPATCHED':
      return typeB
        ? 'StructBay is delivering to the customer'
        : 'Mark delivered with POD and delivery date';
    case 'DELIVERED':
      return typeB
        ? 'Awaiting StructBay delivery confirmation'
        : 'Awaiting StructBay delivery confirmation';
    case 'REJECTED':
      return 'No further action (rejected)';
    case 'COMPLETED':
      return 'None';
    default:
      return 'Follow order instructions';
  }
}

module.exports = {
  decorateVendorOrderForPortal,
  customerMilestoneFromVendorStatus,
  aggregateCustomerMilestone,
  pendingVendorAction,
  WORKFLOW_TIMELINE_STEPS,
};
