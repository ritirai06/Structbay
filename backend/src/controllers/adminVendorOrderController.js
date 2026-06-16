const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const VendorOrder = require('../models/VendorOrder');
const Order = require('../models/Order');
const User = require('../models/User');
const VendorOrderStatusAudit = require('../models/VendorOrderStatusAudit');
const VendorInvoice = require('../models/VendorInvoice');
const VendorDispatch = require('../models/VendorDispatch');
const { notifyVendor } = require('../services/vendorNotification.service');
const { PAGINATION } = require('../config/constants');
const { generateSubOrderNumber, getNextSubOrderIndex } = require('../services/refNumber.service');

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
    Order.findById(masterOrderId).populate('customer', 'name phone email').lean(),
    User.findOne({ _id: vendorId, role: 'VENDOR', vendorStatus: 'APPROVED' }),
  ]);

  if (!masterOrder) throw new AppError('Master order not found.', 404);
  if (!vendor) throw new AppError('Vendor not found or not approved.', 404);
  if (!assignedProducts?.length) throw new AppError('assignedProducts is required.', 400);

  const subOrderIndex = await getNextSubOrderIndex(masterOrderId);
  const orderNumber = generateSubOrderNumber(masterOrder.orderNumber, subOrderIndex);

  const items = assignedProducts.map((ap) => {
    const qty = Number(ap.quantity) || 0;
    const unit = Number(ap.unitPrice) || 0;
    const lineTotal = Number(ap.lineTotal) > 0 ? Number(ap.lineTotal) : qty * unit;
    return {
      product: ap.product,
      variation: ap.variation || null,
      masterItemId: ap.masterItemId || undefined,
      productName: ap.productName || 'Product',
      sku: ap.sku || undefined,
      quantity: qty,
      unitPrice: unit,
      gstPercentage: ap.gstPercentage != null ? Number(ap.gstPercentage) : 18,
      lineTotal,
    };
  });

  const ship = deliveryAddress || masterOrder.shippingAddress || {};
  const custInfo = customer || {};
  const moCust = masterOrder.customer || {};

  const customerInfo = {
    name: custInfo.name || ship.name || moCust.name || 'Customer',
    phone: custInfo.phone || ship.phone || moCust.phone || '',
  };

  const resolvedDelivery = {
    line1: ship.line1 || '',
    line2: ship.line2 || '',
    city: ship.city || '',
    state: ship.state || '',
    pincode: ship.pincode || '',
    contactPerson: ship.contactPerson || ship.name || customerInfo.name,
    contactPhone: ship.contactPhone || ship.phone || customerInfo.phone,
  };

  const lineSum = items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
  const resolvedTotal = Number(totalAmount) > 0 ? Number(totalAmount) : lineSum;

  const vendorOrder = await VendorOrder.create({
    masterOrder: masterOrderId,
    orderNumber,
    subOrderIndex,
    vendor: vendorId,
    assignedBy: req.user._id,
    items,
    customerInfo,
    deliveryAddress: resolvedDelivery,
    deliveryType: deliveryType || 'vendor_delivery',
    totalAmount: resolvedTotal,
    workflowVersion: 2,
    adminNotes,
    dispatchInstructions,
    expectedDispatchDate,
    expectedDeliveryDate,
    priority: priority || 'normal',
    status: 'NEW_ASSIGNED',
    statusHistory: [{
      status: 'NEW_ASSIGNED',
      updatedBy: req.user._id,
      model: 'User',
      note: 'Order assigned by admin',
      timestamp: new Date(),
    }],
  });

  await Order.findByIdAndUpdate(masterOrderId, { $addToSet: { vendorOrders: vendorOrder._id } });

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
      .populate('items.product', 'name')
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
    .populate('items.product', 'name brand images sku')
    .populate('items.variation', 'attributes sku')
    .populate('assignedBy', 'name email');

  if (!order) throw new AppError('Vendor order not found.', 404);

  const [statusAudits, vendorInvoices, dispatches] = await Promise.all([
    VendorOrderStatusAudit.find({ vendorOrder: order._id }).sort({ changedAt: -1 }).limit(200).lean(),
    VendorInvoice.find({ vendorOrder: order._id }).sort({ createdAt: -1 }).lean(),
    VendorDispatch.find({ vendorOrder: order._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const plain = order.toObject({ virtuals: true });
  return ApiResponse.success(res, 200, 'Vendor order retrieved.', {
    ...plain,
    statusAudits,
    vendorInvoices,
    dispatches,
  });
});

// ─── PUT /api/v1/admin/vendor-orders/:id  ─────────────────────────────────────
// Admin can update notes, status, dates, StructBay logistics (Type B delivery)
const updateVendorOrder = asyncHandler(async (req, res) => {
  const allowed = ['adminNotes', 'dispatchInstructions', 'status', 'priority',
    'expectedDispatchDate', 'expectedDeliveryDate', 'invoiceStatus'];

  const order = await VendorOrder.findById(req.params.id);
  if (!order) throw new AppError('Vendor order not found.', 404);

  if (Number(order.workflowVersion) === 2 && req.body.status !== undefined) {
    throw new AppError('Cannot set status directly on workflow v2 orders. Use workflow endpoints.', 400);
  }

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

  order.status = 'CANCELLED';
  order.adminNotes = reason ? `Cancelled: ${reason}` : order.adminNotes;
  order.statusHistory.push({
    status: 'CANCELLED',
    updatedBy: req.user._id,
    model: 'User',
    note: reason || 'Cancelled by admin',
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
