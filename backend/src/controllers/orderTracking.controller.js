const asyncHandler   = require('../utils/asyncHandler');
const ApiResponse    = require('../utils/apiResponse');
const AppError       = require('../utils/AppError');
const Order          = require('../models/Order');
const VendorOrder    = require('../models/VendorOrder');
const Shipment       = require('../models/Shipment');
const OrderDocument  = require('../models/OrderDocument');
const OrderActivityLog = require('../models/OrderActivityLog');
const Notification   = require('../models/Notification');
const Inventory      = require('../models/Inventory');
const InventoryLog   = require('../models/InventoryLog');

// ─── GET /customer/orders ─────────────────────────────────────────────────────
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, search } = req.query;
  const filter = { customer: req.user._id };
  if (status) filter.status = status;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('city', 'name state')
      .populate('items.product', 'name images sku')
      .populate('items.variation', 'attributes sku')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Orders retrieved.', orders, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /customer/orders/:id ─────────────────────────────────────────────────
exports.getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('city', 'name state')
    .populate('items.product', 'name images sku gstPercentage')
    .populate('items.variation', 'attributes sku images');
  if (!order) throw new AppError('Order not found.', 404);
  return ApiResponse.success(res, 200, 'Order retrieved.', order);
});

// ─── GET /customer/orders/:id/tracking ────────────────────────────────────────
exports.getTracking = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .select('orderNumber status statusHistory createdAt city')
    .populate('city', 'name state');
  if (!order) throw new AppError('Order not found.', 404);

  // Get shipments with public delivery notes
  const shipments = await Shipment.find({ masterOrder: order._id })
    .select('status timeline deliveryNotes estimatedDelivery actualDelivery trackingNumber trackingUrl');

  // Filter delivery notes visible to customer
  const publicShipments = shipments.map((s) => ({
    ...s.toObject(),
    deliveryNotes: s.deliveryNotes.filter((n) => n.visibleToCustomer),
  }));

  // Activity log (public events only)
  const publicActions = [
    'ORDER_PLACED', 'STATUS_CHANGED', 'VENDOR_ASSIGNED',
    'DISPATCH_CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP',
    'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_CONFIRMED',
  ];
  const activity = await OrderActivityLog.find({
    masterOrder: order._id,
    action: { $in: publicActions },
  }).sort({ createdAt: 1 }).select('action description createdAt');

  return ApiResponse.success(res, 200, 'Tracking retrieved.', {
    order: { orderNumber: order.orderNumber, status: order.status, createdAt: order.createdAt, statusHistory: order.statusHistory, city: order.city },
    shipments: publicShipments,
    timeline: activity,
  });
});

// ─── GET /customer/orders/:id/documents ───────────────────────────────────────
exports.getDocuments = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id }).select('_id');
  if (!order) throw new AppError('Order not found.', 404);

  const docs = await OrderDocument.find({
    masterOrder: order._id,
    visibleToCustomer: true,
  }).select('documentType label url mimeType createdAt');

  return ApiResponse.success(res, 200, 'Documents retrieved.', docs);
});

// ─── PATCH /customer/orders/:id/cancel ───────────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);

  const nonCancellable = ['OUT_FOR_DELIVERY', 'DISPATCHED', 'PARTIALLY_DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
  if (nonCancellable.includes(order.status)) {
    throw new AppError(`Order cannot be cancelled at status: ${order.status}.`, 422);
  }

  const prev = order.status;
  order.status = 'CANCELLED';
  order.statusHistory.push({ status: 'CANCELLED', changedBy: req.user._id, note: req.body.reason || 'Cancelled by customer.' });
  await order.save();

  // Release reserved inventory
  if (['PENDING', 'PAID', 'VENDOR_ASSIGNMENT_PENDING', 'PROCESSING'].includes(prev)) {
    for (const item of order.items) {
      const q = { product: item.product, city: order.city };
      if (item.variation) q.variation = item.variation;
      await Inventory.findOneAndUpdate(q, { $inc: { reserved: -item.quantity } });
    }
  }

  await Notification.create({
    customer: req.user._id,
    title: 'Order Cancelled',
    message: `Your order ${order.orderNumber} has been cancelled.`,
    type: 'ORDER', refId: order.orderNumber,
  });

  return ApiResponse.success(res, 200, 'Order cancelled.', order);
});

// ─── POST /customer/orders/:id/confirm-delivery ───────────────────────────────
exports.confirmDelivery = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);
  if (!['DELIVERED', 'PARTIALLY_DELIVERED'].includes(order.status)) {
    throw new AppError('Order is not in delivered status.', 422);
  }

  order.status = 'COMPLETED';
  order.statusHistory.push({ status: 'COMPLETED', changedBy: req.user._id, note: 'Delivery confirmed by customer.' });
  await order.save();

  return ApiResponse.success(res, 200, 'Delivery confirmed. Order completed.', order);
});
