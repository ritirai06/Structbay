const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');

const TERMINAL_VENDOR = new Set(['REJECTED', 'CANCELLED']);

function vendorProgressRank(status) {
  const s = String(status || '');
  if (s === 'COMPLETED') return 7;
  if (s === 'DELIVERED') return 6;
  if (['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCH_CONFIRMED', 'PICKED_UP'].includes(s)) return 5;
  if (s === 'SB_INVOICE_SENT') return 4;
  if (['VENDOR_INVOICE_SUBMITTED', 'DISPATCH_APPROVED', 'INVOICE_UPLOADED'].includes(s)) return 3;
  if (s === 'READY_FOR_DISPATCH') return 2;
  if (['ACCEPTED', 'CHANGES_REQUESTED', 'NEW_ASSIGNED', 'ASSIGNED', 'PICKUP_SCHEDULED'].includes(s)) return 1;
  return 0;
}

/**
 * Derive master-order status from active vendor sub-orders (Type A + Type B share the same VO statuses).
 */
function deriveMasterStatusFromVendorOrders(vendorOrders) {
  const active = (vendorOrders || []).filter((vo) => !TERMINAL_VENDOR.has(String(vo.status || '')));
  if (!active.length) return null;

  if (active.every((vo) => vo.status === 'COMPLETED')) return 'COMPLETED';
  if (active.every((vo) => ['DELIVERED', 'COMPLETED'].includes(vo.status))) return 'DELIVERED';
  if (active.some((vo) => ['DELIVERED', 'COMPLETED'].includes(vo.status))) return 'PARTIALLY_DELIVERED';
  if (active.every((vo) => vendorProgressRank(vo.status) >= 5)) return 'DISPATCHED';
  if (active.some((vo) => vendorProgressRank(vo.status) >= 5)) return 'PARTIALLY_DISPATCHED';
  if (active.some((vo) => vo.status === 'READY_FOR_DISPATCH')) return 'READY_FOR_DISPATCH';
  if (active.some((vo) => vendorProgressRank(vo.status) >= 1)) return 'PROCESSING';
  return 'VENDOR_ASSIGNMENT_PENDING';
}

/**
 * Keep customer + admin master-order status aligned with vendor workflow (v2).
 */
async function syncMasterOrderStatusFromVendorOrders(masterOrderId, { changedBy = null, note } = {}) {
  if (!masterOrderId) return null;

  const order = await Order.findById(masterOrderId);
  if (!order) return null;
  if (['CANCELLED', 'RETURNED'].includes(order.status)) return order;

  const vendorOrders = await VendorOrder.find({ masterOrder: masterOrderId }).select('status').lean();
  const next = deriveMasterStatusFromVendorOrders(vendorOrders);
  if (!next || next === order.status) return order;

  order.status = next;
  order.statusHistory.push({
    status: next,
    changedBy,
    note: note || 'Updated from vendor fulfilment progress.',
  });
  await order.save();
  return order;
}

module.exports = {
  deriveMasterStatusFromVendorOrders,
  syncMasterOrderStatusFromVendorOrders,
};
