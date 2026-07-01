const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const User = require('../models/User');
const { ROLES, VENDOR_STATUS } = require('../config/constants');
const { logAction } = require('../services/auditLog.service');
const { generateMasterOrderNumber } = require('../services/order.service');
const { releaseInventory } = require('../services/order.service');
const VendorOrder = require('../models/VendorOrder');
const { generateSubOrderNumber, getNextSubOrderIndex } = require('../services/refNumber.service');
const { notifyVendor } = require('../services/vendorNotification.service');
const { notifyAllAdmins } = require('../services/staffNotification.service');
const {
  assignOrderLineFulfillment,
  bulkAssignOrderLineFulfillment,
  getDeliveryTypeOverrideLogs,
} = require('../services/orderLineFulfillment.service');

const generateOrderNumber = () => generateMasterOrderNumber();

const activeOrderFilter = (extra = {}) => ({
  ...extra,
  isDeleted: { $ne: true },
});

const getAll = asyncHandler(async (req, res) => {
  const { status, city, vendor, customer, search, page = 1, limit = 20 } = req.query;
  const filter = activeOrderFilter();
  if (status) filter.status = status;
  if (city) filter.city = city;
  if (vendor) filter.assignedVendor = vendor;
  if (customer) filter.customer = customer;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('city', 'name state')
      .populate('assignedVendor', 'name companyName')
      .populate('paymentTransactionId')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Orders retrieved.', orders, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const { aggregateCustomerMilestone } = require('../utils/vendorOrderPortal');
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('city', 'name state')
    .populate('assignedVendor', 'name companyName')
    .populate('items.product', 'name sku images deliveryType')
    .populate('items.assignedVendorUser', 'name companyName email')
    .populate('items.variation', 'attributes sku')
    .populate('paymentTransactionId')
    .populate({
      path: 'vendorOrders',
      select: 'orderNumber deliveryType status invoiceStatus structbayLogistics vendor totalAmount workflowVersion',
    });
  if (!order) throw new AppError('Order not found.', 404);
  const payload = order.toObject({ virtuals: true });
  const ids = (payload.vendorOrders || []).map((v) => v._id).filter(Boolean);
  if (ids.length) {
    const VendorOrder = require('../models/VendorOrder');
    const vos = await VendorOrder.find({ _id: { $in: ids } }).select('status workflowVersion').lean();
    payload.customerVendorFulfillmentMilestone = aggregateCustomerMilestone(vos);
  }
  return ApiResponse.success(res, 200, 'Order retrieved.', payload);
});

const create = asyncHandler(async (req, res) => {
  const orderNumber = await generateOrderNumber();
  const order = await Order.create({ ...req.body, orderNumber });
  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'Order', targetId: order._id.toString(),
    description: `Created order: ${orderNumber}`, ipAddress: req.ip });
  return ApiResponse.created(res, 'Order created.', order);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  const oldStatus = order.status;
  order.status = status;
  order.statusHistory.push({ status, changedBy: req.user._id, note });
  await order.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order', targetId: order._id.toString(),
    description: `Status: ${oldStatus} → ${status}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Order status updated.', order);
});

const VALID_DELIVERY_TYPES = ['vendor_delivery', 'structbay_delivery'];

const assignVendor = asyncHandler(async (req, res) => {
  const { vendorId, deliveryType: rawDeliveryType } = req.body;
  if (!vendorId) throw new AppError('vendorId is required.', 400);
  const deliveryType = rawDeliveryType && VALID_DELIVERY_TYPES.includes(rawDeliveryType)
    ? rawDeliveryType
    : 'vendor_delivery';
  const vendor = await User.findOne({
    _id: vendorId,
    role: ROLES.VENDOR,
    vendorStatus: VENDOR_STATUS.APPROVED,
  }).select('name email companyName');
  if (!vendor) throw new AppError('Vendor not found or not approved (use an approved vendor User id from Vendor Management).', 404);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  order.assignedVendor = vendor._id;
  for (const line of order.items) {
    if (!line.defaultDeliveryType) {
      line.defaultDeliveryType = line.deliveryType || deliveryType;
    }
    if (!line.deliveryType) line.deliveryType = deliveryType;
    line.assignedVendorUser = vendor._id;
  }
  if (order.status === 'VENDOR_ASSIGNMENT_PENDING') {
    order.status = 'PROCESSING';
    order.statusHistory.push({
      status: 'PROCESSING',
      changedBy: req.user._id,
      note: 'Vendor assigned by admin.',
    });
  }
  await order.save();

  // Vendor portal lists VendorOrder documents — create a sub-order when none exists for this vendor.
  try {
    const existingVo = await VendorOrder.findOne({
      masterOrder: order._id,
      vendor: vendor._id,
    })
      .select('_id')
      .lean();

    // Single existing sub-order with legacy Vendor id: align vendor to this User so portal queries match.
    if (!existingVo) {
      const allVos = await VendorOrder.find({ masterOrder: order._id }).select('_id vendor').lean();
      if (allVos.length === 1 && String(allVos[0].vendor) !== String(vendor._id)) {
        await VendorOrder.findByIdAndUpdate(allVos[0]._id, {
          $set: { vendor: vendor._id },
        });
        await Order.findByIdAndUpdate(order._id, { $addToSet: { vendorOrders: allVos[0]._id } });
        notifyVendor({
          vendorId: vendor._id,
          type: 'order_assigned',
          title: 'New order assigned',
          message: `Order has been assigned to you (sub-order updated for your account).`,
          relatedOrder: allVos[0]._id,
          actionUrl: `/orders/${allVos[0]._id}`,
          actionLabel: 'View order',
          createdBy: req.user._id,
        }).catch(() => {});
      }
    }

    const existingVoAfterLink = await VendorOrder.findOne({
      masterOrder: order._id,
      vendor: vendor._id,
    })
      .select('_id status deliveryType')
      .lean();

    if (existingVoAfterLink) {
      const earlyStatuses = new Set(['NEW_ASSIGNED', 'ASSIGNED', 'ACCEPTED', 'READY_FOR_DISPATCH', 'CHANGES_REQUESTED']);
      if (earlyStatuses.has(existingVoAfterLink.status)) {
        await VendorOrder.findByIdAndUpdate(existingVoAfterLink._id, {
          $set: { deliveryType },
        });
      }
    }

    if (!existingVoAfterLink && order.items?.length) {
      const full = await Order.findById(order._id).populate('customer', 'name phone email').lean();
      const cust = full.customer || {};
      const ship = full.shippingAddress || {};
      const subOrderIndex = await getNextSubOrderIndex(order._id);
      const subOrderNumber = generateSubOrderNumber(full.orderNumber, subOrderIndex);
      const items = full.items.map((line) => ({
        product: line.product,
        variation: line.variation || undefined,
        masterItemId: line._id,
        productName: line.name,
        sku: line.sku || undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        gstPercentage: line.gstPercentage ?? 18,
        lineTotal: line.lineTotal,
      }));
      const lineSum = items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
      const totalAmount = Number(full.grandTotal) > 0 ? full.grandTotal : lineSum;
      const sub = await VendorOrder.create({
        masterOrder: order._id,
        orderNumber: subOrderNumber,
        subOrderIndex,
        vendor: vendor._id,
        assignedBy: req.user._id,
        assignedAt: new Date(),
        items,
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
          updatedBy: req.user._id,
          model: 'User',
          note: 'Vendor assigned from master order by admin.',
          timestamp: new Date(),
        }],
        invoiceStatus: 'PENDING',
        dispatchStatus: 'PENDING',
        totalAmount,
        workflowVersion: 2,
      });
      await Order.findByIdAndUpdate(order._id, { $addToSet: { vendorOrders: sub._id } });
      for (const line of order.items) {
        line.vendorOrderId = sub._id;
      }
      await order.save();
      notifyVendor({
        vendorId: vendor._id,
        type: 'order_assigned',
        title: 'New order assigned',
        message: `Order ${subOrderNumber} has been assigned to you.`,
        relatedOrder: sub._id,
        actionUrl: `/orders/${sub._id}`,
        actionLabel: 'View order',
        createdBy: req.user._id,
      }).catch(() => {});
      notifyAllAdmins({
        type: 'ORDER_ASSIGNED',
        title: 'Vendor order created',
        message: `Sub-order ${subOrderNumber} assigned from master order.`,
        relatedVendorOrder: sub._id,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[assignVendor] VendorOrder create/link failed:', err?.message || err);
  }

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Order',
    targetId: order._id.toString(),
    description: `Assigned vendor user: ${vendor._id}`,
    ipAddress: req.ip,
  });
  const populated = await Order.findById(order._id)
    .populate('customer', 'name email phone')
    .populate('city', 'name state')
    .populate('assignedVendor', 'name email companyName');
  return ApiResponse.success(res, 200, 'Vendor assigned.', populated);
});

const patchItemFulfillment = asyncHandler(async (req, res) => {
  const { vendorId, deliveryType, reason } = req.body;
  const { order, vendorOrder } = await assignOrderLineFulfillment({
    orderId: req.params.id,
    itemId: req.params.itemId,
    vendorId,
    deliveryType,
    reason,
    adminUserId: req.user._id,
  });
  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Order',
    targetId: order._id.toString(),
    description: `Line fulfillment updated (item ${req.params.itemId})`,
    ipAddress: req.ip,
  });
  const populated = await Order.findById(order._id)
    .populate('customer', 'name email phone')
    .populate('city', 'name state')
    .populate('assignedVendor', 'name companyName')
    .populate('items.product', 'name sku images deliveryType')
    .populate('items.assignedVendorUser', 'name companyName email')
    .populate({
      path: 'vendorOrders',
      select: 'orderNumber deliveryType status invoiceStatus structbayLogistics vendor totalAmount workflowVersion',
    });
  return ApiResponse.success(res, 200, 'Line fulfillment updated.', { order: populated, vendorOrder });
});

const bulkPatchItemFulfillment = asyncHandler(async (req, res) => {
  const order = await bulkAssignOrderLineFulfillment({
    orderId: req.params.id,
    assignments: req.body.assignments,
    adminUserId: req.user._id,
  });
  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Order',
    targetId: order._id.toString(),
    description: `Bulk line fulfillment updated (${req.body.assignments?.length || 0} lines)`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Line fulfillment updated.', order);
});

const listDeliveryTypeOverrides = asyncHandler(async (req, res) => {
  const logs = await getDeliveryTypeOverrideLogs(req.params.id);
  return ApiResponse.success(res, 200, 'Delivery type override logs.', logs);
});

const patchOrderDetails = asyncHandler(async (req, res) => {
  const allowed = ['deliveryDetails', 'adminNotes', 'notes', 'shippingAddress'];
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) order[f] = req.body[f];
  });
  await order.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order', targetId: order._id.toString(),
    description: 'Order details / delivery notes updated.', ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Order updated.', order);
});

/** Admin confirms payment received (COD / credit / manual verification). */
const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentStatus, note } = req.body;
  const allowed = ['PAID', 'FAILED', 'CANCELLED'];
  if (!paymentStatus || !allowed.includes(paymentStatus)) {
    throw new AppError(`paymentStatus must be one of: ${allowed.join(', ')}`, 400);
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);

  const oldPay = order.paymentStatus;
  order.paymentStatus = paymentStatus;
  const methodLabel = order.paymentMethod || 'unspecified';
  const histNote =
    note?.trim() ||
    `Payment ${paymentStatus.toLowerCase()} (was ${oldPay}) · method: ${methodLabel}`;
  order.statusHistory.push({
    status: order.status,
    changedBy: req.user._id,
    note: histNote,
  });
  await order.save();

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Order',
    targetId: order._id.toString(),
    description: `Payment ${oldPay} → ${paymentStatus} (${methodLabel})`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Payment status updated.', order);
});

const uploadDocs = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  if (req.body.invoiceUrl) order.invoiceUrl = req.body.invoiceUrl;
  if (req.body.ewayBillUrl) order.ewayBillUrl = req.body.ewayBillUrl;
  await order.save();
  return ApiResponse.success(res, 200, 'Documents uploaded.', order);
});

const getStats = asyncHandler(async (req, res) => {
  const active = activeOrderFilter();
  // Align with checkout: new orders are often VENDOR_ASSIGNMENT_PENDING / PAID, not legacy PENDING-only.
  const [total, pending, processing, dispatched, delivered, cancelled] = await Promise.all([
    Order.countDocuments(active),
    Order.countDocuments({
      ...active,
      status: { $in: ['PENDING', 'PAID', 'VENDOR_ASSIGNMENT_PENDING'] },
    }),
    Order.countDocuments({
      ...active,
      status: { $in: ['PROCESSING', 'READY_FOR_DISPATCH', 'PARTIALLY_DISPATCHED'] },
    }),
    Order.countDocuments({
      ...active,
      status: { $in: ['DISPATCHED', 'PARTIALLY_DELIVERED'] },
    }),
    Order.countDocuments({
      ...active,
      status: { $in: ['DELIVERED', 'COMPLETED'] },
    }),
    Order.countDocuments({ ...active, status: 'CANCELLED' }),
  ]);
  return ApiResponse.success(res, 200, 'Order stats.', { total, pending, processing, dispatched, delivered, cancelled });
});

/** Same scope for invoice table + all KPI aggregates (avoids pending ₹ with 0 rows). */
const invoiceListFilter = () => ({
  isDeleted: { $ne: true },
  status: { $nin: ['CANCELLED', 'RETURNED'] },
  paymentStatus: { $nin: ['REFUNDED', 'CANCELLED'] },
});

const listInvoices = asyncHandler(async (req, res) => {
  const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limitNum = Math.min(100, parseInt(req.query.limit, 10) || 25);
  const filter = invoiceListFilter();

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const rows = orders.map((o) => {
    const pdfUrl = o.structbayInvoiceUrl || o.invoiceUrl || null;
    const hasPdf = !!(pdfUrl && String(pdfUrl).trim());
    let displayStatus = 'Pending';
    if (hasPdf) displayStatus = 'Issued';
    else if (o.paymentStatus === 'PAID') displayStatus = 'Paid';
    else if (o.paymentStatus === 'PENDING') displayStatus = 'Payment pending';

    return {
      _id: o._id,
      invoiceLabel: o.customerInvoiceNumber || o.orderNumber,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || '—',
      subtotal: o.subtotal,
      gstTotal: o.gstTotal,
      grandTotal: o.grandTotal,
      paymentStatus: o.paymentStatus,
      displayStatus,
      pdfUrl,
      updatedAt: o.updatedAt,
    };
  });

  return ApiResponse.success(res, 200, 'Invoices retrieved.', rows, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

const invoiceSummary = asyncHandler(async (req, res) => {
  const base = invoiceListFilter();
  const [totalRows, paidAgg, pendingAgg, withPdf, pendingCount, paidCount] = await Promise.all([
    Order.countDocuments(base),
    Order.aggregate([
      { $match: { ...base, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.aggregate([
      { $match: { ...base, paymentStatus: 'PENDING' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.countDocuments({
      ...base,
      $or: [
        { structbayInvoiceUrl: { $nin: [null, ''] } },
        { invoiceUrl: { $nin: [null, ''] } },
      ],
    }),
    Order.countDocuments({ ...base, paymentStatus: 'PENDING' }),
    Order.countDocuments({ ...base, paymentStatus: 'PAID' }),
  ]);

  return ApiResponse.success(res, 200, 'Invoice summary.', {
    totalRows,
    ordersWithPdf: withPdf,
    pendingPaymentAmount: pendingAgg[0]?.total || 0,
    totalCollectedAmount: paidAgg[0]?.total || 0,
    pendingOrderCount: pendingCount,
    paidOrderCount: paidCount,
  });
});

const NON_DELETABLE_ORDER_STATUSES = [
  'READY_FOR_DISPATCH',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'PARTIALLY_DELIVERED',
];
const INVENTORY_RELEASE_STATUSES = [
  'PENDING',
  'PAID',
  'VENDOR_ASSIGNMENT_PENDING',
  'PROCESSING',
];
const BULK_DELETE_MAX = 200;

async function deleteOrderHard(order, userId, ip) {
  if (NON_DELETABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError(
      'Cannot delete while order is in active dispatch or delivery. Cancel the order or wait until it is completed.',
      400
    );
  }
  if (INVENTORY_RELEASE_STATUSES.includes(order.status)) {
    try {
      await releaseInventory(order.items, order.city);
    } catch {
      /* best effort */
    }
  }
  await Promise.all([
    VendorOrder.deleteMany({ masterOrder: order._id }),
    Order.deleteOne({ _id: order._id }),
  ]);
  await logAction({
    adminId: userId,
    action: 'DELETE',
    module: 'Order',
    targetId: order._id.toString(),
    description: `Deleted order ${order.orderNumber}`,
    ipAddress: ip,
  });
}

const remove = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  await deleteOrderHard(order, req.user._id, req.ip);
  return ApiResponse.success(res, 200, 'Order deleted.', { id: order._id });
});

const bulkRemove = asyncHandler(async (req, res) => {
  const raw = req.body?.ids;
  const ids = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : [];
  if (!ids.length) throw new AppError('No valid order ids provided.', 400);
  if (ids.length > BULK_DELETE_MAX) {
    throw new AppError(`Too many ids (max ${BULK_DELETE_MAX}).`, 400);
  }

  const errors = [];
  let ok = 0;
  for (const id of ids) {
    try {
      const order = await Order.findById(id);
      if (!order) throw new AppError('Order not found.', 404);
      await deleteOrderHard(order, req.user._id, req.ip);
      ok += 1;
    } catch (e) {
      errors.push({
        id,
        message: e instanceof AppError ? e.message : (e && e.message) || String(e),
      });
    }
  }

  return ApiResponse.success(res, 200, `Deleted ${ok} order(s).`, {
    total: ids.length,
    succeeded: ok,
    failed: errors.length,
    errors,
  });
});

module.exports = {
  getAll,
  getById,
  create,
  updateStatus,
  assignVendor,
  patchItemFulfillment,
  bulkPatchItemFulfillment,
  listDeliveryTypeOverrides,
  uploadDocs,
  getStats,
  patchOrderDetails,
  confirmPayment,
  listInvoices,
  invoiceSummary,
  remove,
  bulkRemove,
};
