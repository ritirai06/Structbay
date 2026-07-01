const VendorOrder = require('../models/VendorOrder');
const VendorActivityLog = require('../models/VendorActivityLog');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { vendorOrderMatch } = require('../utils/vendorOrderAccess');
const { decorateVendorOrderForPortal } = require('../utils/vendorOrderPortal');
const { buildVendorOrderDocuments } = require('../utils/vendorOrderDocuments');
const { notifyVendor } = require('../services/vendorNotification.service');

const VENDOR_ALLOWED_STATUSES = [
  'READY_FOR_DISPATCH',
  'INVOICE_UPLOADED',
  'DISPATCH_CONFIRMED',
  'DELIVERED',
  'COMPLETED',
];

// @desc    Get All Assigned Orders
// @route   GET /api/v1/vendor/orders
exports.getAssignedOrders = async (req, res) => {
  const { status, invoiceStatus, dispatchStatus, search, page = 1, limit = 20 } = req.query;
  const match = await vendorOrderMatch(req.user);
  /** Never overwrite `match.$or` / access clauses — combine search with `$and`. */
  const query =
    search && String(search).trim()
      ? {
          $and: [
            { ...match },
            {
              $or: [
                { orderNumber: { $regex: String(search).trim(), $options: 'i' } },
                { 'customerInfo.name': { $regex: String(search).trim(), $options: 'i' } },
                { 'deliveryAddress.city': { $regex: String(search).trim(), $options: 'i' } },
              ],
            },
          ],
        }
      : { ...match };

  if (status) {
    const raw = String(status).trim();
    if (raw.includes(',')) {
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length) query.status = { $in: parts };
    } else {
      query.status = raw;
    }
  }
  if (invoiceStatus) query.invoiceStatus = invoiceStatus;
  if (dispatchStatus) query.dispatchStatus = dispatchStatus;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [orders, total] = await Promise.all([
    VendorOrder.find(query)
      .populate('items.product', 'name brand images sku')
      .populate('items.variation', 'attributes sku')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    VendorOrder.countDocuments(query),
  ]);

  const payload = orders.map((o) => decorateVendorOrderForPortal(o));

  return ApiResponse.success(res, 200, 'Orders retrieved.', payload, {
    page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / parseInt(limit, 10)),
  });
};

// @desc    Get Single Order Details (only lines assigned to this vendor)
// @route   GET /api/v1/vendor/orders/:id
exports.getOrderDetails = async (req, res) => {
  const match = await vendorOrderMatch(req.user);
  const order = await VendorOrder.findOne({ _id: req.params.id, ...match })
    .populate('items.product', 'name brand images sku')
    .populate('items.variation', 'attributes sku')
    .populate('assignedBy', 'name email')
    .populate('masterOrder', 'orderNumber paymentMethod paymentStatus grandTotal');

  if (!order) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'order_view',
    description: `Viewed order ${order.orderNumber}`,
    relatedOrder: order._id, ipAddress: req.ip,
  }).catch(() => {});

  const payload = decorateVendorOrderForPortal(order);
  payload.documents = await buildVendorOrderDocuments(order);

  return ApiResponse.success(res, 200, 'Order details retrieved.', payload);
};

// @desc    Update Order Status
// @route   PUT /api/v1/vendor/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  const { status, remarks } = req.body;

  if (!VENDOR_ALLOWED_STATUSES.includes(status)) {
    return ApiResponse.badRequest(res, `Invalid status. Allowed: ${VENDOR_ALLOWED_STATUSES.join(', ')}`);
  }

  const match = await vendorOrderMatch(req.user);
  const order = await VendorOrder.findOne({ _id: req.params.id, ...match });
  if (!order) return ApiResponse.notFound(res, 'Order not found.');

  if (Number(order.workflowVersion) === 2) {
    return ApiResponse.badRequest(
      res,
      'This order uses the Structbay workflow — use Accept / Ready for dispatch / Mark delivered actions instead of manual status updates.'
    );
  }

  const oldStatus = order.status;
  order.status = status;
  order.statusHistory.push({
    status, updatedBy: req.user._id, model: 'User', note: remarks, timestamp: new Date(),
  });
  await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'status_update',
    description: `Updated order ${order.orderNumber}: ${oldStatus} → ${status}`,
    relatedOrder: order._id,
    changes: { field: 'status', oldValue: oldStatus, newValue: status },
    ipAddress: req.ip,
  }).catch(() => {});

  // Customer + vendor dashboard notifications (email for customer is optional / future template)
  try {
    const master = await Order.findById(order.masterOrder).select('customer orderNumber').lean();
    if (master?.customer) {
      if (status === 'DISPATCH_CONFIRMED') {
        await Notification.create({
          customer: master.customer,
          title: 'Dispatch confirmed',
          message: `Dispatch has been confirmed for part of your order ${master.orderNumber} (${order.orderNumber}).`,
          type: 'DISPATCH',
          refId: master.orderNumber,
        });
      }
      if (status === 'DELIVERED' || status === 'COMPLETED') {
        await Notification.create({
          customer: master.customer,
          title: 'Order delivered',
          message: `Your materials for order ${master.orderNumber} (${order.orderNumber}) are marked delivered.`,
          type: 'DELIVERY',
          refId: master.orderNumber,
        });
      }
    }
  } catch { /* non-blocking */ }

  if (status === 'DISPATCH_CONFIRMED') {
    notifyVendor({
      vendorId: req.user._id,
      type: 'dispatch_confirmation',
      title: 'Dispatch confirmed',
      message: `You confirmed dispatch for ${order.orderNumber}. Structbay and the customer have been notified.`,
      relatedOrder: order._id,
      actionUrl: `/orders/${order._id}`,
      actionLabel: 'View order',
    }).catch(() => {});
  }

  return ApiResponse.success(res, 200, 'Order status updated.', decorateVendorOrderForPortal(order));
};

// @desc    Search Orders
// @route   POST /api/v1/vendor/orders/search
exports.searchOrders = async (req, res) => {
  const { orderNumber, customerName, city, status, invoiceStatus, dateFrom, dateTo, dispatchStatus } = req.body;
  const match = await vendorOrderMatch(req.user);
  const query = { ...match };

  if (orderNumber) query.orderNumber = { $regex: orderNumber, $options: 'i' };
  if (customerName) query['customerInfo.name'] = { $regex: customerName, $options: 'i' };
  if (city) query['deliveryAddress.city'] = { $regex: city, $options: 'i' };
  if (status) {
    const raw = String(status).trim();
    if (raw.includes(',')) {
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length) query.status = { $in: parts };
    } else {
      query.status = raw;
    }
  }
  if (invoiceStatus) query.invoiceStatus = invoiceStatus;
  if (dispatchStatus) query.dispatchStatus = dispatchStatus;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const orders = await VendorOrder.find(query)
    .populate('items.product', 'name brand')
    .sort({ createdAt: -1 }).limit(100);

  return ApiResponse.success(res, 200, 'Search results.', orders.map((o) => decorateVendorOrderForPortal(o)));
};

// @desc    Get Order History (Completed)
// @route   GET /api/v1/vendor/orders/history
exports.getOrderHistory = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const match = await vendorOrderMatch(req.user);
  const query = {
    ...match,
    status: { $in: ['DELIVERED', 'COMPLETED'] },
  };
  const [orders, total] = await Promise.all([
    VendorOrder.find(query)
      .populate('items.product', 'name brand')
      .sort({ actualDeliveryDate: -1 }).skip(skip).limit(parseInt(limit, 10)),
    VendorOrder.countDocuments(query),
  ]);

  return ApiResponse.success(res, 200, 'Order history retrieved.', orders.map((o) => decorateVendorOrderForPortal(o)), {
    page: parseInt(page, 10), limit: parseInt(limit, 10), total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
};
