const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const Order        = require('../models/Order');
const Notification = require('../models/Notification');
const Inventory    = require('../models/Inventory');

// GET /customer/orders
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

// GET /customer/orders/:id
exports.getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('city', 'name state')
    .populate('items.product', 'name images sku gstPercentage')
    .populate('items.variation', 'attributes sku images');

  if (!order) throw new AppError('Order not found.', 404);
  return ApiResponse.success(res, 200, 'Order retrieved.', order);
});

// PATCH /customer/orders/:id/cancel
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);

  const nonCancellable = ['DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (nonCancellable.includes(order.status)) {
    throw new AppError(`Order cannot be cancelled at status: ${order.status}.`, 422);
  }

  const prevStatus = order.status;
  order.status = 'CANCELLED';
  order.statusHistory.push({ status: 'CANCELLED', changedBy: req.user._id, note: req.body.reason || 'Cancelled by customer.' });
  await order.save();

  // Release reserved inventory
  if (['PENDING', 'CONFIRMED', 'PROCESSING'].includes(prevStatus)) {
    for (const item of order.items) {
      const invQ = { product: item.product, city: order.city };
      if (item.variation) invQ.variation = item.variation;
      await Inventory.findOneAndUpdate(invQ, { $inc: { reserved: -item.quantity } });
    }
  }

  // Notification
  await Notification.create({
    customer: req.user._id,
    title: 'Order Cancelled',
    message: `Your order ${order.orderNumber} has been cancelled.`,
    type: 'ORDER',
    refId: order.orderNumber,
  });

  return ApiResponse.success(res, 200, 'Order cancelled.', order);
});
