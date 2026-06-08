const VendorOrder = require('../models/VendorOrder');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');

const VENDOR_ALLOWED_STATUSES = [
  'ready_for_dispatch', 'vendor_invoice_sent', 'dispatched', 'material_delivered',
];

// @desc    Get All Assigned Orders
// @route   GET /api/v1/vendor/orders
exports.getAssignedOrders = async (req, res) => {
  const { status, invoiceStatus, dispatchStatus, search, page = 1, limit = 20 } = req.query;
  const query = { vendor: req.user._id };

  if (status)         query.status         = status;
  if (invoiceStatus)  query.invoiceStatus  = invoiceStatus;
  if (dispatchStatus) query.dispatchStatus = dispatchStatus;
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'deliveryAddress.city': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    VendorOrder.find(query)
      .populate('assignedProducts.product', 'name brand images')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    VendorOrder.countDocuments(query),
  ]);

  return ApiResponse.success(res, 200, 'Orders retrieved.', orders, {
    page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)),
  });
};

// @desc    Get Single Order Details
// @route   GET /api/v1/vendor/orders/:id
exports.getOrderDetails = async (req, res) => {
  const order = await VendorOrder.findOne({ _id: req.params.id, vendor: req.user._id })
    .populate('assignedProducts.product', 'name brand images sku')
    .populate('assignedBy', 'name email');

  if (!order) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'order_view',
    description: `Viewed order ${order.orderNumber}`,
    relatedOrder: order._id, ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Order details retrieved.', order);
};

// @desc    Update Order Status
// @route   PUT /api/v1/vendor/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  const { status, remarks } = req.body;

  if (!VENDOR_ALLOWED_STATUSES.includes(status))
    return ApiResponse.badRequest(res, `Invalid status. Allowed: ${VENDOR_ALLOWED_STATUSES.join(', ')}`);

  const order = await VendorOrder.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!order) return ApiResponse.notFound(res, 'Order not found.');

  const oldStatus = order.status;
  order.status = status;
  order.statusHistory.push({
    status, updatedBy: req.user._id, updatedByModel: 'User', remarks, timestamp: new Date(),
  });
  await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'status_update',
    description: `Updated order ${order.orderNumber}: ${oldStatus} → ${status}`,
    relatedOrder: order._id,
    changes: { field: 'status', oldValue: oldStatus, newValue: status },
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Order status updated.', order);
};

// @desc    Search Orders
// @route   POST /api/v1/vendor/orders/search
exports.searchOrders = async (req, res) => {
  const { orderNumber, customerName, city, status, invoiceStatus, dateFrom, dateTo, dispatchStatus } = req.body;
  const query = { vendor: req.user._id };

  if (orderNumber)   query.orderNumber             = { $regex: orderNumber, $options: 'i' };
  if (customerName)  query['customer.name']         = { $regex: customerName, $options: 'i' };
  if (city)          query['deliveryAddress.city']  = { $regex: city, $options: 'i' };
  if (status)        query.status                   = status;
  if (invoiceStatus) query.invoiceStatus            = invoiceStatus;
  if (dispatchStatus)query.dispatchStatus           = dispatchStatus;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   query.createdAt.$lte = new Date(dateTo);
  }

  const orders = await VendorOrder.find(query)
    .populate('assignedProducts.product', 'name brand')
    .sort({ createdAt: -1 }).limit(100);

  return ApiResponse.success(res, 200, 'Search results.', orders);
};

// @desc    Get Order History (Completed)
// @route   GET /api/v1/vendor/orders/history
exports.getOrderHistory = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { vendor: req.user._id, status: { $in: ['delivery_confirmed', 'completed'] } };
  const [orders, total] = await Promise.all([
    VendorOrder.find(query)
      .populate('assignedProducts.product', 'name brand')
      .sort({ actualDeliveryDate: -1 }).skip(skip).limit(parseInt(limit)),
    VendorOrder.countDocuments(query),
  ]);

  return ApiResponse.success(res, 200, 'Order history retrieved.', orders, {
    page: parseInt(page), limit: parseInt(limit), total,
    pages: Math.ceil(total / parseInt(limit)),
  });
};
