const asyncHandler       = require('../utils/asyncHandler');
const ApiResponse        = require('../utils/apiResponse');
const AppError           = require('../utils/AppError');
const Order              = require('../models/Order');
const Vendor             = require('../models/Vendor');
const VendorOrder        = require('../models/VendorOrder');
const VendorAssignment   = require('../models/VendorAssignment');
const VendorNotification = require('../models/VendorNotification');
const { logAction }      = require('../services/auditLog.service');
const { generateSubOrderNumber, logOrderActivity, notifyCustomer } = require('../services/order.service');

// ─── POST /orders/:id/vendor-assignments ──────────────────────────────────────
// Assign one or more vendors to item groups in a single call
// Body: { assignments: [{ vendorId, itemIds: [...], deliveryType, notes }] }
exports.assignVendors = asyncHandler(async (req, res) => {
  const { assignments } = req.body;
  if (!assignments?.length) throw new AppError('assignments array required.', 400);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);

  const NONASSIGNABLE = ['CANCELLED', 'DELIVERED', 'COMPLETED'];
  if (NONASSIGNABLE.includes(order.status)) {
    throw new AppError(`Cannot assign vendor to order in status: ${order.status}`, 422);
  }

  // Existing sub-order count to generate index
  let subIndex = (await VendorOrder.countDocuments({ masterOrder: order._id })) + 1;

  const createdVendorOrders = [];

  for (const a of assignments) {
    const { vendorId, itemIds, deliveryType, notes, priority, expectedDispatchDate, expectedDeliveryDate } = a;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new AppError(`Vendor ${vendorId} not found.`, 404);
    if (vendor.status !== 'active') throw new AppError(`Vendor ${vendor.companyName} is not active.`, 422);

    const assignedItems = order.items.filter((i) => itemIds.includes(i._id.toString()));
    if (!assignedItems.length) throw new AppError('No matching items found for assignment.', 400);

    const totalAmount = assignedItems.reduce((s, i) => s + i.lineTotal, 0);
    const subOrderNumber = generateSubOrderNumber(order.orderNumber, subIndex++);

    const subOrderItems = assignedItems.map((i) => ({
      product:       i.product,
      variation:     i.variation,
      masterItemId:  i._id,
      productName:   i.name,
      sku:           i.sku,
      variationLabel: i.variationLabel || undefined,
      quantity:      i.quantity,
      unitPrice:     i.unitPrice,
      gstPercentage: i.gstPercentage,
      lineTotal:     i.lineTotal,
    }));

    const vendorOrder = await VendorOrder.create({
      masterOrder:  order._id,
      orderNumber:  subOrderNumber,
      subOrderIndex: subIndex - 1,
      vendor:       vendorId,
      assignedBy:   req.user._id,
      assignmentNotes: notes,
      items:        subOrderItems,
      customerInfo: { name: null, phone: null }, // will be populated below safely
      deliveryAddress: order.shippingAddress,
      deliveryType:  deliveryType || 'vendor_delivery',
      totalAmount:   Math.round(totalAmount),
      priority:      priority || 'normal',
      expectedDispatchDate,
      expectedDeliveryDate,
      status: 'ASSIGNED',
      statusHistory: [{ status: 'ASSIGNED', updatedBy: req.user._id, model: 'User', note: 'Assigned by admin.' }],
    });

    // Populate limited customer info (name, phone) after creation
    const customer = await Order.findById(order._id).populate('customer', 'name phone').lean();
    if (customer?.customer) {
      await VendorOrder.findByIdAndUpdate(vendorOrder._id, {
        customerInfo: { name: customer.customer.name, phone: customer.customer.phone },
      });
    }

    // Track assignment
    await VendorAssignment.create({
      masterOrder:  order._id,
      vendorOrder:  vendorOrder._id,
      vendor:       vendorId,
      assignedBy:   req.user._id,
      assignedItems: assignedItems.map((i) => ({
        orderItemId: i._id, product: i.product, quantity: i.quantity, unitPrice: i.unitPrice,
      })),
      deliveryType: deliveryType || 'vendor_delivery',
      city:  order.city,
      notes,
      history: [{ action: 'assigned', vendor: vendorId, byAdmin: req.user._id, note: notes }],
    });

    // Update items on master order with vendor ref
    for (const item of assignedItems) {
      item.assignedVendor  = vendorId;
      item.vendorOrderId   = vendorOrder._id;
    }

    // Vendor notification
    await VendorNotification.create({
      vendor: vendorId,
      type: 'new_order',
      title: 'New Order Assigned',
      message: `Sub-order ${subOrderNumber} has been assigned to you.`,
      orderId: vendorOrder._id,
    }).catch(() => {});

    createdVendorOrders.push(vendorOrder);
  }

  // Update master order
  order.vendorOrders.push(...createdVendorOrders.map((vo) => vo._id));
  if (order.status === 'PENDING' || order.status === 'PAID' || order.status === 'VENDOR_ASSIGNMENT_PENDING') {
    order.status = 'PROCESSING';
    order.statusHistory.push({ status: 'PROCESSING', changedBy: req.user._id, note: 'Vendor(s) assigned.' });
  }
  await order.save();

  await logOrderActivity({ masterOrder: order._id, actorType: 'ADMIN', actor: req.user._id,
    action: 'VENDOR_ASSIGNED', description: `${assignments.length} vendor(s) assigned. Sub-orders: ${createdVendorOrders.map((v) => v.orderNumber).join(', ')}` });
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order',
    targetId: order._id.toString(), description: 'Vendor(s) assigned.', ipAddress: req.ip });
  await notifyCustomer({ customerId: order.customer,
    title: 'Vendor Assigned', type: 'ORDER', refId: order.orderNumber,
    message: `Vendors have been assigned to your order ${order.orderNumber}. Processing begins now.` });

  return ApiResponse.created(res, 'Vendor(s) assigned.', createdVendorOrders);
});

// ─── PATCH /vendor-orders/:id/reassign ───────────────────────────────────────
// Change the vendor for a sub-order
exports.reassignVendor = asyncHandler(async (req, res) => {
  const { newVendorId, reason } = req.body;
  if (!newVendorId) throw new AppError('newVendorId required.', 400);

  const vendorOrder = await VendorOrder.findById(req.params.id);
  if (!vendorOrder) throw new AppError('Sub-order not found.', 404);

  const newVendor = await Vendor.findById(newVendorId);
  if (!newVendor || newVendor.status !== 'active') throw new AppError('Vendor not found or inactive.', 404);

  const oldVendorId = vendorOrder.vendor;
  vendorOrder.vendor     = newVendorId;
  vendorOrder.assignedBy = req.user._id;
  vendorOrder.assignedAt = new Date();
  vendorOrder.status     = 'ASSIGNED';
  vendorOrder.statusHistory.push({ status: 'ASSIGNED', updatedBy: req.user._id, model: 'User', note: `Reassigned from ${oldVendorId}. Reason: ${reason}` });
  await vendorOrder.save();

  // Update assignment record
  await VendorAssignment.findOneAndUpdate(
    { vendorOrder: vendorOrder._id, status: 'active' },
    { status: 'reassigned', $push: { history: { action: 'reassigned', vendor: newVendorId, byAdmin: req.user._id, note: reason } } }
  );

  await VendorAssignment.create({
    masterOrder:  vendorOrder.masterOrder,
    vendorOrder:  vendorOrder._id,
    vendor:       newVendorId,
    assignedBy:   req.user._id,
    assignedItems: [],
    deliveryType:  vendorOrder.deliveryType,
    notes:         reason,
    history: [{ action: 'assigned', vendor: newVendorId, byAdmin: req.user._id, note: reason }],
  });

  // Notify new vendor
  await VendorNotification.create({
    vendor: newVendorId,
    type: 'new_order',
    title: 'Order Reassigned to You',
    message: `Sub-order ${vendorOrder.orderNumber} has been assigned to you.`,
    orderId: vendorOrder._id,
  }).catch(() => {});

  await logOrderActivity({ masterOrder: vendorOrder.masterOrder, vendorOrder: vendorOrder._id,
    actorType: 'ADMIN', actor: req.user._id, action: 'VENDOR_REASSIGNED',
    description: `Vendor changed from ${oldVendorId} to ${newVendorId}. Reason: ${reason}` });

  return ApiResponse.success(res, 200, 'Vendor reassigned.', vendorOrder);
});

// ─── GET /orders/:id/vendor-assignments ───────────────────────────────────────
exports.getAssignments = asyncHandler(async (req, res) => {
  const assignments = await VendorAssignment.find({ masterOrder: req.params.id })
    .populate('vendor', 'companyName contactPerson phone')
    .populate('vendorOrder')
    .sort({ createdAt: 1 });
  return ApiResponse.success(res, 200, 'Assignments retrieved.', assignments);
});

// ─── GET /vendor-orders (admin — all sub-orders) ──────────────────────────────
exports.getAllVendorOrders = asyncHandler(async (req, res) => {
  const { vendor, status, page = 1, limit = 20, search } = req.query;
  const filter = {};
  if (vendor) filter.vendor = vendor;
  if (status) filter.status = status;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const [vendorOrders, total] = await Promise.all([
    VendorOrder.find(filter)
      .populate('vendor', 'companyName contactPerson phone')
      .populate('masterOrder', 'orderNumber status grandTotal')
      .populate('items.product', 'name sku images')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    VendorOrder.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Vendor orders retrieved.', vendorOrders, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /vendor-orders/:id (admin) ───────────────────────────────────────────
exports.getVendorOrderById = asyncHandler(async (req, res) => {
  const vo = await VendorOrder.findById(req.params.id)
    .populate('vendor', 'companyName contactPerson phone email gstNumber')
    .populate('masterOrder', 'orderNumber customer status grandTotal shippingAddress')
    .populate('items.product', 'name sku images')
    .populate('items.variation', 'attributes sku')
    .populate('assignedBy', 'name email');
  if (!vo) throw new AppError('Vendor order not found.', 404);
  return ApiResponse.success(res, 200, 'Vendor order retrieved.', vo);
});

// ─── PATCH /vendor-orders/:id/status (admin update sub-order status) ──────────
exports.updateVendorOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!status) throw new AppError('status required.', 400);

  const vo = await VendorOrder.findById(req.params.id);
  if (!vo) throw new AppError('Vendor order not found.', 404);

  vo.status = status;
  vo.statusHistory.push({ status, updatedBy: req.user._id, model: 'User', note });
  if (status === 'DISPATCH_CONFIRMED') vo.actualDispatchDate = new Date();
  if (status === 'DELIVERED')          vo.actualDeliveryDate = new Date();
  await vo.save();

  await logOrderActivity({ masterOrder: vo.masterOrder, vendorOrder: vo._id,
    actorType: 'ADMIN', actor: req.user._id, action: 'STATUS_CHANGED',
    description: `Sub-order ${vo.orderNumber} status: ${status}` });

  return ApiResponse.success(res, 200, 'Vendor order status updated.', vo);
});
