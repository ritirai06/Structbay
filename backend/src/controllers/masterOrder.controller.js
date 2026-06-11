const asyncHandler       = require('../utils/asyncHandler');
const ApiResponse        = require('../utils/apiResponse');
const AppError           = require('../utils/AppError');
const Order              = require('../models/Order');
const VendorOrder        = require('../models/VendorOrder');
const Notification       = require('../models/Notification');
const { logAction }      = require('../services/auditLog.service');
const {
  generateMasterOrderNumber,
  generateSubOrderNumber,
  logOrderActivity,
  notifyCustomer,
  releaseInventory,
  deductInventory,
} = require('../services/order.service');

// ─── Helper ───────────────────────────────────────────────────────────────────
const populateOrder = (q) =>
  q.populate('customer', 'name email phone')
   .populate('city', 'name state')
   .populate('items.product', 'name sku images')
   .populate('items.variation', 'attributes sku')
   .populate('items.assignedVendor', 'companyName contactPerson phone')
   .populate({ path: 'vendorOrders', populate: { path: 'vendor', select: 'companyName contactPerson phone' } });

// ─── GET /orders ──────────────────────────────────────────────────────────────
exports.getAll = asyncHandler(async (req, res) => {
  const {
    status, city, customer, search,
    paymentStatus, dateFrom, dateTo,
    page = 1, limit = 20,
  } = req.query;

  const filter = {};
  if (status)        filter.status = status;
  if (city)          filter.city = city;
  if (customer)      filter.customer = customer;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search)        filter.orderNumber = { $regex: search, $options: 'i' };
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
  }

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('city', 'name state')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Orders retrieved.', orders, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /orders/stats ────────────────────────────────────────────────────────
exports.getStats = asyncHandler(async (req, res) => {
  const statuses = [
    'PENDING','PAID','VENDOR_ASSIGNMENT_PENDING','PROCESSING',
    'READY_FOR_DISPATCH','PARTIALLY_DISPATCHED','DISPATCHED',
    'PARTIALLY_DELIVERED','DELIVERED','COMPLETED','CANCELLED',
  ];
  const counts = await Promise.all(statuses.map((s) => Order.countDocuments({ status: s })));
  const stats = {};
  statuses.forEach((s, i) => { stats[s] = counts[i]; });
  stats.total = counts.reduce((a, b) => a + b, 0);
  return ApiResponse.success(res, 200, 'Order stats.', stats);
});

// ─── GET /orders/:id ─────────────────────────────────────────────────────────
exports.getById = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) throw new AppError('Order not found.', 404);
  return ApiResponse.success(res, 200, 'Order retrieved.', order);
});

// ─── POST /orders (admin manual creation) ─────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const orderNumber = await generateMasterOrderNumber();
  const order = await Order.create({
    ...req.body,
    orderNumber,
    statusHistory: [{ status: req.body.status || 'PENDING', changedBy: req.user._id, note: 'Created by admin.' }],
  });
  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'Order',
    targetId: order._id.toString(), description: `Admin created order ${orderNumber}`, ipAddress: req.ip });
  await logOrderActivity({ masterOrder: order._id, actorType: 'ADMIN', actor: req.user._id,
    action: 'ORDER_PLACED', description: `Order ${orderNumber} created by admin.`, ipAddress: req.ip });
  return ApiResponse.created(res, 'Order created.', order);
});

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!status) throw new AppError('status is required.', 400);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);

  const old = order.status;
  order.status = status;
  order.statusHistory.push({ status, changedBy: req.user._id, note });
  await order.save();

  // Deduct inventory on delivery
  if (status === 'DELIVERED' || status === 'COMPLETED') {
    await deductInventory(order.items, order.city, order._id, req.user._id);
  }

  await logOrderActivity({ masterOrder: order._id, actorType: 'ADMIN', actor: req.user._id,
    action: 'STATUS_CHANGED', description: `Status: ${old} → ${status}`, oldValue: old, newValue: status });
  await notifyCustomer({
    customerId: order.customer,
    title: `Order ${status.replace(/_/g, ' ')}`,
    message: `Your order ${order.orderNumber} status is now: ${status.replace(/_/g, ' ')}.`,
    type: 'ORDER', refId: order.orderNumber,
  });

  return ApiResponse.success(res, 200, 'Status updated.', order);
});

// ─── PATCH /orders/:id/edit ───────────────────────────────────────────────────
exports.editOrder = asyncHandler(async (req, res) => {
  const allowed = ['adminNotes', 'notes', 'shippingAddress', 'paymentMethod', 'deliveryDetails'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!order) throw new AppError('Order not found.', 404);

  await logOrderActivity({ masterOrder: order._id, actorType: 'ADMIN', actor: req.user._id,
    action: 'ORDER_UPDATED', description: 'Order details updated.', newValue: updates });
  return ApiResponse.success(res, 200, 'Order updated.', order);
});

// ─── DELETE /orders/:id (soft cancel) ────────────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  if (order.status === 'CANCELLED') throw new AppError('Order already cancelled.', 422);

  const non = ['DISPATCHED', 'DELIVERED', 'COMPLETED'];
  if (non.includes(order.status) && !req.body.adminOverride) {
    throw new AppError('Cannot cancel after dispatch. Use adminOverride:true.', 422);
  }

  order.status = 'CANCELLED';
  order.adminNotes = req.body.reason || order.adminNotes;
  order.statusHistory.push({ status: 'CANCELLED', changedBy: req.user._id, note: req.body.reason || 'Cancelled by admin.' });
  await order.save();

  await releaseInventory(order.items, order.city);

  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order',
    targetId: order._id.toString(), description: `Order ${order.orderNumber} cancelled.`, ipAddress: req.ip });
  await notifyCustomer({ customerId: order.customer,
    title: 'Order Cancelled', type: 'ORDER', refId: order.orderNumber,
    message: `Your order ${order.orderNumber} has been cancelled.` });

  return ApiResponse.success(res, 200, 'Order cancelled.', order);
});

// ─── POST /orders/:id/split ───────────────────────────────────────────────────
// Body: { splitGroups: [[itemId, itemId], [itemId]] }
exports.splitOrder = asyncHandler(async (req, res) => {
  const { splitGroups } = req.body;
  if (!splitGroups || !Array.isArray(splitGroups) || splitGroups.length < 2) {
    throw new AppError('Provide at least 2 split groups (array of item ID arrays).', 400);
  }

  const original = await Order.findById(req.params.id);
  if (!original) throw new AppError('Order not found.', 404);
  if (original.isSplit) throw new AppError('Order has already been split.', 422);

  const newOrders = [];
  for (const group of splitGroups) {
    const items = original.items.filter((i) => group.includes(i._id.toString()));
    if (!items.length) continue;

    const subtotal  = items.reduce((s, i) => s + i.lineTotal, 0);
    const gstTotal  = items.reduce((s, i) => s + (i.lineTotal * i.gstPercentage) / 100, 0);
    const grandTotal = Math.round(subtotal + gstTotal);
    const orderNumber = await generateMasterOrderNumber();

    const newOrder = await Order.create({
      orderNumber,
      customer:        original.customer,
      city:            original.city,
      items,
      shippingAddress: original.shippingAddress,
      subtotal:        Math.round(subtotal),
      gstTotal:        Math.round(gstTotal),
      grandTotal,
      paymentStatus:   original.paymentStatus,
      paymentMethod:   original.paymentMethod,
      status:          'VENDOR_ASSIGNMENT_PENDING',
      isSplit:         true,
      splitFromOrder:  original._id,
      statusHistory: [{ status: 'VENDOR_ASSIGNMENT_PENDING', changedBy: req.user._id, note: `Split from ${original.orderNumber}` }],
    });
    newOrders.push(newOrder);
  }

  original.isSplit = true;
  original.status  = 'CANCELLED';
  original.statusHistory.push({ status: 'CANCELLED', changedBy: req.user._id, note: 'Split into sub-orders.' });
  original.adminNotes = `Split into: ${newOrders.map((o) => o.orderNumber).join(', ')}`;
  await original.save();

  await logOrderActivity({ masterOrder: original._id, actorType: 'ADMIN', actor: req.user._id,
    action: 'ORDER_SPLIT', description: `Split into ${newOrders.map((o) => o.orderNumber).join(', ')}` });
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order',
    targetId: original._id.toString(), description: `Order ${original.orderNumber} split.`, ipAddress: req.ip });

  return ApiResponse.success(res, 200, 'Order split successfully.', { original, newOrders });
});

// ─── PATCH /orders/:id/add-note ───────────────────────────────────────────────
exports.addNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note) throw new AppError('note is required.', 400);
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { adminNotes: note },
    { new: true }
  );
  if (!order) throw new AppError('Order not found.', 404);
  await logOrderActivity({ masterOrder: order._id, actorType: 'ADMIN', actor: req.user._id,
    action: 'NOTE_ADDED', description: note });
  return ApiResponse.success(res, 200, 'Note added.', order);
});
