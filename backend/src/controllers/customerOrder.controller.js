const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const Order        = require('../models/Order');
const Notification = require('../models/Notification');
const Inventory    = require('../models/Inventory');
const Shipment     = require('../models/Shipment');
const VendorOrder  = require('../models/VendorOrder');
const {
  CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES,
  VENDOR_ORDER_STATUSES_BLOCKING_CUSTOMER_CANCEL,
} = require('../constants/orderCancellation');

// GET /customer/orders
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, search } = req.query;
  const filter = { customer: req.user._id };
  if (status) filter.status = status;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

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

  if (!CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES.includes(order.status)) {
    throw new AppError(
      order.status === 'READY_FOR_DISPATCH'
        ? 'Order cannot be cancelled once it is Ready for Dispatch. Contact StructBay support.'
        : `Order cannot be cancelled at status: ${order.status}.`,
      422
    );
  }

  const vendorDispatchStarted = await VendorOrder.exists({
    masterOrder: order._id,
    status: { $in: VENDOR_ORDER_STATUSES_BLOCKING_CUSTOMER_CANCEL },
  });
  if (vendorDispatchStarted) {
    throw new AppError(
      'Order cannot be cancelled after the vendor has marked it Ready for Dispatch. Contact StructBay support.',
      422
    );
  }

  const shipmentOpen = ['CREATED', 'PICKUP_SCHEDULED', 'PICKED_UP'];
  const shipmentAdvanced = await Shipment.exists({
    masterOrder: order._id,
    status: { $nin: shipmentOpen },
  });
  if (shipmentAdvanced) {
    throw new AppError('Order cannot be cancelled after dispatch or delivery has started.', 422);
  }

  const prevStatus = order.status;
  order.status = 'CANCELLED';
  order.statusHistory.push({ status: 'CANCELLED', changedBy: req.user._id, note: req.body.reason || 'Cancelled by customer.' });
  await order.save();

  // Release reserved inventory (pre-dispatch)
  if (CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES.includes(prevStatus)) {
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
