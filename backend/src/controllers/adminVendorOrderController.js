const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const VendorOrder = require('../models/VendorOrder');
const Order = require('../models/Order');
const User = require('../models/User');
const { notifyVendor } = require('../services/vendorNotification.service');
const { PAGINATION } = require('../config/constants');
const { generateSubOrderNumber } = require('../services/refNumber.service');

// ─── Generate vendor sub-order number from master ORD number ─────────────────
async function genVendorOrderNumber(masterOrderId) {
  const master = await Order.findById(masterOrderId).select('orderNumber');
  if (!master?.orderNumber) {
    const { generatePrdMasterOrderNumber } = require('../services/refNumber.service');
    return generatePrdMasterOrderNumber();
  }
  const nextIdx = (await VendorOrder.countDocuments({ masterOrder: masterOrderId })) + 1;
  return generateSubOrderNumber(master.orderNumber, nextIdx);
}

// ─── POST /api/v1/admin/vendor-orders  ────────────────────────────────────────
// Assign master order products to a vendor
const assignOrderToVendor = asyncHandler(async (req, res) => {
  const {
    masterOrderId, vendorId, assignedProducts,
    deliveryType, deliveryAddress, customer,
    totalAmount, adminNotes, dispatchInstructions,
    expectedDispatchDate, expectedDeliveryDate, priority,
  } = req.body;

  const [masterOrder, vendor] = await Promise.all([
    Order.findById(masterOrderId),
    User.findOne({ _id: vendorId, role: 'VENDOR', vendorStatus: 'APPROVED' }),
  ]);

  if (!masterOrder) throw new AppError('Master order not found.', 404);
  if (!vendor) throw new AppError('Vendor not found or not approved.', 404);
  if (!assignedProducts?.length) throw new AppError('assignedProducts is required.', 400);

  const orderNumber = await genVendorOrderNumber(masterOrderId);

  const vendorOrder = await VendorOrder.create({
    masterOrder: masterOrderId,
    orderNumber,
    vendor: vendorId,
    assignedBy: req.user._id,
    assignedProducts,
    customer,
    deliveryAddress,
    deliveryType: deliveryType || 'vendor_delivery',
    totalAmount,
    adminNotes,
    dispatchInstructions,
    expectedDispatchDate,
    expectedDeliveryDate,
    priority: priority || 'normal',
    status: 'new_order_alert',
    statusHistory: [{
      status: 'new_order_alert',
      updatedBy: req.user._id,
      updatedByModel: 'User',
      remarks: 'Order assigned by admin',
      timestamp: new Date(),
    }],
  });

  // Fire notification — non-blocking
  notifyVendor({
    vendorId,
    type: 'order_assigned',
    title: 'New Order Assigned',
    message: `Order ${orderNumber} has been assigned to you. Please review and upload invoice.`,
    priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'normal',
    relatedOrder: vendorOrder._id,
    actionUrl: `/orders/${vendorOrder._id}`,
    actionLabel: 'View Order',
    createdBy: req.user._id,
  }).catch(() => {});

  return ApiResponse.created(res, 'Vendor order assigned successfully.', vendorOrder);
});

// ─── GET /api/v1/admin/vendor-orders  ─────────────────────────────────────────
const getAllVendorOrders = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    vendorId, status, invoiceStatus, dispatchStatus, search,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (vendorId)      filter.vendor         = vendorId;
  if (status)        filter.status         = status;
  if (invoiceStatus) filter.invoiceStatus  = invoiceStatus;
  if (dispatchStatus)filter.dispatchStatus = dispatchStatus;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'deliveryAddress.city': { $regex: search, $options: 'i' } },
    ];
  }

  const [orders, total] = await Promise.all([
    VendorOrder.find(filter)
      .populate('vendor', 'name email companyName')
      .populate('assignedProducts.product', 'name')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limitNum),
    VendorOrder.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Vendor orders retrieved.', orders, {
    page: pageNum, limit: limitNum, total,
    pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /api/v1/admin/vendor-orders/:id  ─────────────────────────────────────
const getVendorOrderById = asyncHandler(async (req, res) => {
  const order = await VendorOrder.findById(req.params.id)
    .populate('vendor', 'name email companyName phone')
    .populate('masterOrder')
    .populate('assignedProducts.product', 'name brand images sku')
    .populate('assignedBy', 'name email');

  if (!order) throw new AppError('Vendor order not found.', 404);
  return ApiResponse.success(res, 200, 'Vendor order retrieved.', order);
});

// ─── PUT /api/v1/admin/vendor-orders/:id  ─────────────────────────────────────
// Admin can update notes, status, dates, StructBay logistics (Type B delivery)
const updateVendorOrder = asyncHandler(async (req, res) => {
  const allowed = ['adminNotes', 'dispatchInstructions', 'status', 'priority',
    'expectedDispatchDate', 'expectedDeliveryDate', 'invoiceStatus'];

  const order = await VendorOrder.findById(req.params.id);
  if (!order) throw new AppError('Vendor order not found.', 404);

  allowed.forEach((f) => {
    if (req.body[f] !== undefined) order[f] = req.body[f];
  });

  if (req.body.structbayLogistics && typeof req.body.structbayLogistics === 'object') {
    order.structbayLogistics = {
      ...(order.structbayLogistics && order.structbayLogistics.toObject
        ? order.structbayLogistics.toObject()
        : order.structbayLogistics || {}),
      ...req.body.structbayLogistics,
    };
  }

  await order.save();

  const populated = await VendorOrder.findById(order._id)
    .populate('vendor', 'name email companyName');

  // Notify vendor on status change
  if (req.body.status) {
    notifyVendor({
      vendorId: populated.vendor._id,
      type: 'order_status_change',
      title: 'Order Status Updated',
      message: `Order ${populated.orderNumber} status changed to: ${req.body.status.replace(/_/g, ' ')}.`,
      priority: 'normal',
      relatedOrder: populated._id,
      actionUrl: `/orders/${populated._id}`,
      createdBy: req.user._id,
    }).catch(() => {});
  }

  return ApiResponse.success(res, 200, 'Vendor order updated.', populated);
});

// ─── POST /api/v1/admin/vendor-orders/:id/request-invoice  ───────────────────
const requestInvoice = asyncHandler(async (req, res) => {
  const order = await VendorOrder.findById(req.params.id).populate('vendor', '_id name');
  if (!order) throw new AppError('Vendor order not found.', 404);

  await notifyVendor({
    vendorId: order.vendor._id,
    type: 'invoice_requested',
    title: 'Invoice Upload Required',
    message: `Please upload your invoice for order ${order.orderNumber} at the earliest.`,
    priority: 'high',
    relatedOrder: order._id,
    actionUrl: `/orders/${order._id}/invoice`,
    actionLabel: 'Upload Invoice',
    createdBy: req.user._id,
  });

  return ApiResponse.success(res, 200, 'Invoice request sent to vendor.');
});

// ─── POST /api/v1/admin/vendor-orders/:id/request-dispatch  ──────────────────
const requestDispatch = asyncHandler(async (req, res) => {
  const order = await VendorOrder.findById(req.params.id).populate('vendor', '_id name');
  if (!order) throw new AppError('Vendor order not found.', 404);

  await notifyVendor({
    vendorId: order.vendor._id,
    type: 'dispatch_requested',
    title: 'Dispatch Requested',
    message: `Please prepare order ${order.orderNumber} for dispatch and update the dispatch details.`,
    priority: 'high',
    relatedOrder: order._id,
    actionUrl: `/orders/${order._id}/ready-dispatch`,
    actionLabel: 'Update Dispatch',
    createdBy: req.user._id,
  });

  return ApiResponse.success(res, 200, 'Dispatch request sent to vendor.');
});

// ─── DELETE /api/v1/admin/vendor-orders/:id  ─────────────────────────────────
const cancelVendorOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await VendorOrder.findById(req.params.id).populate('vendor', '_id');
  if (!order) throw new AppError('Vendor order not found.', 404);

  order.status = 'cancelled';
  order.adminNotes = reason ? `Cancelled: ${reason}` : order.adminNotes;
  order.statusHistory.push({
    status: 'cancelled',
    updatedBy: req.user._id,
    updatedByModel: 'User',
    remarks: reason || 'Cancelled by admin',
    timestamp: new Date(),
  });
  await order.save();

  notifyVendor({
    vendorId: order.vendor._id,
    type: 'order_status_change',
    title: 'Order Cancelled',
    message: `Order ${order.orderNumber} has been cancelled${reason ? ': ' + reason : ''}.`,
    priority: 'high',
    relatedOrder: order._id,
    createdBy: req.user._id,
  }).catch(() => {});

  return ApiResponse.success(res, 200, 'Vendor order cancelled.');
});

// ─── GET /api/v1/admin/vendor-orders/analytics  ──────────────────────────────
const getVendorOrderAnalytics = asyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  const mongoose = require('mongoose');
  const match = vendorId ? { vendor: new mongoose.Types.ObjectId(vendorId) } : {};

  const [byStatus, byVendor, byMonth] = await Promise.all([
    VendorOrder.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $group: { _id: '$vendor', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: '$vendor' },
      { $project: { count: 1, totalAmount: 1, 'vendor.name': 1, 'vendor.companyName': 1 } },
    ]),
    VendorOrder.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
        amount: { $sum: '$totalAmount' },
      }},
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Analytics retrieved.', { byStatus, byVendor, byMonth });
});

module.exports = {
  assignOrderToVendor,
  getAllVendorOrders,
  getVendorOrderById,
  updateVendorOrder,
  requestInvoice,
  requestDispatch,
  cancelVendorOrder,
  getVendorOrderAnalytics,
};
