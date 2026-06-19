const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const User = require('../models/User');
const DeliveryTypeOverrideLog = require('../models/DeliveryTypeOverrideLog');
const AppError = require('../utils/AppError');
const { ROLES, VENDOR_STATUS } = require('../config/constants');
const { generateSubOrderNumber, getNextSubOrderIndex } = require('../services/refNumber.service');
const { notifyVendor } = require('../services/vendorNotification.service');
const { notifyAllAdmins } = require('../services/staffNotification.service');
const { VALID_DELIVERY_TYPES } = require('../utils/productDeliveryType');

const EARLY_VO_STATUSES = new Set([
  'NEW_ASSIGNED',
  'ASSIGNED',
  'ACCEPTED',
  'READY_FOR_DISPATCH',
  'CHANGES_REQUESTED',
]);

function buildVoItemFromOrderLine(line) {
  return {
    product: line.product,
    variation: line.variation || undefined,
    masterItemId: line._id,
    productName: line.name,
    sku: line.sku || undefined,
    variationLabel: line.variationLabel || undefined,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    gstPercentage: line.gstPercentage ?? 18,
    lineTotal: line.lineTotal,
  };
}

async function validateApprovedVendor(vendorId) {
  const vendor = await User.findOne({
    _id: vendorId,
    role: ROLES.VENDOR,
    vendorStatus: VENDOR_STATUS.APPROVED,
  }).select('name email companyName');
  if (!vendor) throw new AppError('Vendor not found or not approved.', 404);
  return vendor;
}

async function logDeliveryTypeOverride({
  order,
  item,
  oldType,
  newType,
  reason,
  adminUserId,
  vendorOrderId,
}) {
  if (!oldType || !newType || oldType === newType) return;
  await DeliveryTypeOverrideLog.create({
    masterOrder: order._id,
    masterItemId: item._id,
    vendorOrder: vendorOrderId || null,
    product: item.product,
    productName: item.name,
    oldType,
    newType,
    reason: (reason || '').trim(),
    changedBy: adminUserId,
  });
}

async function createVendorOrderForLine({ order, line, vendor, deliveryType, adminUserId }) {
  const cust = order.customer || {};
  const ship = order.shippingAddress || {};
  const subOrderIndex = await getNextSubOrderIndex(order._id);
  const subOrderNumber = generateSubOrderNumber(order.orderNumber, subOrderIndex);
  const totalAmount = Number(line.lineTotal) || 0;

  const sub = await VendorOrder.create({
    masterOrder: order._id,
    orderNumber: subOrderNumber,
    subOrderIndex,
    vendor: vendor._id,
    assignedBy: adminUserId,
    assignedAt: new Date(),
    items: [buildVoItemFromOrderLine(line)],
    customerInfo: {
      name: ship.name || cust.name || 'Customer',
      phone: ship.phone || cust.phone || '',
    },
    deliveryAddress: {
      line1: ship.line1 || '',
      line2: ship.line2 || '',
      city: ship.city || '',
      state: ship.state || '',
      pincode: ship.pincode || '',
      contactPerson: ship.name || cust.name || '',
      contactPhone: ship.phone || cust.phone || '',
    },
    deliveryType,
    status: 'NEW_ASSIGNED',
    statusHistory: [{
      status: 'NEW_ASSIGNED',
      updatedBy: adminUserId,
      model: 'User',
      note: 'Per-product vendor assignment by admin.',
      timestamp: new Date(),
    }],
    invoiceStatus: 'PENDING',
    dispatchStatus: 'PENDING',
    totalAmount,
    workflowVersion: 2,
  });

  await Order.findByIdAndUpdate(order._id, { $addToSet: { vendorOrders: sub._id } });

  notifyVendor({
    vendorId: vendor._id,
    type: 'order_assigned',
    title: 'New order assigned',
    message: `Order ${subOrderNumber} has been assigned to you.`,
    relatedOrder: sub._id,
    actionUrl: `/orders/${sub._id}`,
    actionLabel: 'View order',
    createdBy: adminUserId,
  }).catch(() => {});

  notifyAllAdmins({
    type: 'ORDER_ASSIGNED',
    title: 'Vendor order created',
    message: `Sub-order ${subOrderNumber} assigned from master order.`,
    relatedVendorOrder: sub._id,
  }).catch(() => {});

  return sub;
}

function resolveLineDeliveryType(item, override) {
  const current = item.deliveryType || item.defaultDeliveryType || 'vendor_delivery';
  if (override && VALID_DELIVERY_TYPES.includes(override)) return override;
  return current;
}

async function maybeAdvanceMasterOrderStatus(order, adminUserId) {
  const allAssigned = order.items.every((ln) => ln.assignedVendorUser);
  if (order.status === 'VENDOR_ASSIGNMENT_PENDING' && allAssigned) {
    order.status = 'PROCESSING';
    order.statusHistory.push({
      status: 'PROCESSING',
      changedBy: adminUserId,
      note: 'All order lines assigned to vendors.',
    });
  }
}

async function assignOrderLineFulfillment({
  orderId,
  itemId,
  vendorId,
  deliveryType,
  reason,
  adminUserId,
}) {
  const order = await Order.findById(orderId).populate('customer', 'name phone email');
  if (!order) throw new AppError('Order not found.', 404);

  const item = order.items.id(itemId);
  if (!item) throw new AppError('Order line not found.', 404);

  const oldType = item.deliveryType || item.defaultDeliveryType || 'vendor_delivery';
  const newType = resolveLineDeliveryType(item, deliveryType);

  let vendor = null;
  if (vendorId) vendor = await validateApprovedVendor(vendorId);

  if (deliveryType && deliveryType !== oldType) {
    if (item.vendorOrderId) {
      const vo = await VendorOrder.findById(item.vendorOrderId).select('status').lean();
      if (vo && !EARLY_VO_STATUSES.has(vo.status)) {
        throw new AppError('Delivery type cannot be changed after fulfillment has progressed.', 409);
      }
    }
    await logDeliveryTypeOverride({
      order,
      item,
      oldType,
      newType: deliveryType,
      reason,
      adminUserId,
      vendorOrderId: item.vendorOrderId,
    });
    item.deliveryType = deliveryType;
  }

  const effectiveType = item.deliveryType || item.defaultDeliveryType || 'vendor_delivery';
  let vendorOrder = null;

  if (vendor) {
    item.assignedVendorUser = vendor._id;
    if (!order.assignedVendor) order.assignedVendor = vendor._id;

    if (item.vendorOrderId) {
      vendorOrder = await VendorOrder.findById(item.vendorOrderId);
      if (vendorOrder) {
        if (String(vendorOrder.vendor) !== String(vendor._id) && !EARLY_VO_STATUSES.has(vendorOrder.status)) {
          throw new AppError('Cannot reassign vendor after fulfillment has progressed.', 409);
        }
        vendorOrder.vendor = vendor._id;
        vendorOrder.deliveryType = effectiveType;
        vendorOrder.items = [buildVoItemFromOrderLine(item)];
        vendorOrder.totalAmount = Number(item.lineTotal) || 0;
        await vendorOrder.save();
      }
    }

    if (!vendorOrder) {
      vendorOrder = await createVendorOrderForLine({
        order,
        line: item,
        vendor,
        deliveryType: effectiveType,
        adminUserId,
      });
      item.vendorOrderId = vendorOrder._id;
    }

    await maybeAdvanceMasterOrderStatus(order, adminUserId);
  } else if (item.vendorOrderId && deliveryType) {
    vendorOrder = await VendorOrder.findById(item.vendorOrderId);
    if (vendorOrder) {
      if (!EARLY_VO_STATUSES.has(vendorOrder.status)) {
        throw new AppError('Delivery type cannot be changed after fulfillment has progressed.', 409);
      }
      vendorOrder.deliveryType = effectiveType;
      await vendorOrder.save();
    }
  }

  await order.save();
  return { order, vendorOrder };
}

async function bulkAssignOrderLineFulfillment({ orderId, assignments, adminUserId }) {
  if (!Array.isArray(assignments) || !assignments.length) {
    throw new AppError('assignments array is required.', 400);
  }
  for (const row of assignments) {
    if (!row?.itemId) throw new AppError('Each assignment requires itemId.', 400);
    await assignOrderLineFulfillment({
      orderId,
      itemId: row.itemId,
      vendorId: row.vendorId,
      deliveryType: row.deliveryType,
      reason: row.reason,
      adminUserId,
    });
  }
  const order = await Order.findById(orderId)
    .populate('customer', 'name email phone')
    .populate('city', 'name state')
    .populate('assignedVendor', 'name companyName')
    .populate('items.product', 'name sku images deliveryType')
    .populate('items.assignedVendorUser', 'name companyName email')
    .populate({
      path: 'vendorOrders',
      select: 'orderNumber deliveryType status invoiceStatus structbayLogistics vendor totalAmount workflowVersion',
    });
  return order;
}

async function getDeliveryTypeOverrideLogs(orderId) {
  return DeliveryTypeOverrideLog.find({ masterOrder: orderId })
    .populate('changedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = {
  assignOrderLineFulfillment,
  bulkAssignOrderLineFulfillment,
  getDeliveryTypeOverrideLogs,
  EARLY_VO_STATUSES,
};
