const asyncHandler   = require('../utils/asyncHandler');
const ApiResponse    = require('../utils/apiResponse');
const AppError       = require('../utils/AppError');
const Order          = require('../models/Order');
const Shipment       = require('../models/Shipment');
const OrderDocument  = require('../models/OrderDocument');
const OrderActivityLog = require('../models/OrderActivityLog');
const Notification   = require('../models/Notification');
const Inventory      = require('../models/Inventory');
const InventoryLog   = require('../models/InventoryLog');
const VendorOrder    = require('../models/VendorOrder');
const VendorInvoice  = require('../models/VendorInvoice');
const { CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES, VENDOR_ORDER_STATUSES_BLOCKING_CUSTOMER_CANCEL } = require('../constants/orderCancellation');
const { customerOrderProgress } = require('../utils/customerOrderProgress');
const { deriveMasterStatusFromVendorOrders } = require('../services/masterOrderStatusSync.service');
const { resolveCustomerMasterOrder } = require('../utils/resolveCustomerOrder');
const { buildOrderAcknowledgementHtml } = require('../services/orderInvoiceHtml.service');
const { buildOrderAcknowledgementPdf } = require('../services/orderInvoicePdf.service');
const {
  listOrderInvoiceFiles,
  fetchInvoiceFileBuffer,
  safeFilename,
} = require('../services/orderInvoiceFiles.service');

// ─── GET /customer/orders ─────────────────────────────────────────────────────
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, search, project } = req.query;
  const filter = { customer: req.user._id };
  if (status) filter.status = status;
  if (project) filter.project = project;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('city', 'name state')
      .populate('items.product', 'name images sku')
      .populate('items.variation', 'attributes sku')
      .populate('project', 'name')
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
  const order = await resolveCustomerMasterOrder(req.user._id, req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  await order.populate([
    { path: 'city', select: 'name state' },
    { path: 'items.product', select: 'name images sku gstPercentage' },
    { path: 'items.variation', select: 'attributes sku images' },
    { path: 'project', select: 'name' }
  ]);
  const payload = order.toObject();
  const vendorOrdersLean = await VendorOrder.find({ masterOrder: order._id }).select('status workflowVersion').lean();
  const derivedStatus = deriveMasterStatusFromVendorOrders(vendorOrdersLean);
  payload.customerProgress = customerOrderProgress(
    derivedStatus ? { ...payload, status: derivedStatus } : payload
  );
  return ApiResponse.success(res, 200, 'Order retrieved.', payload);
});

// ─── GET /customer/orders/:id/tracking ────────────────────────────────────────
exports.getTracking = asyncHandler(async (req, res) => {
  const order = await resolveCustomerMasterOrder(req.user._id, req.params.id);
  if (!order) throw new AppError('Order not found.', 404);

  await order.populate('city', 'name state');

  // Get shipments with public delivery notes
  const shipments = await Shipment.find({ masterOrder: order._id })
    .select('status timeline deliveryNotes estimatedDelivery actualDelivery trackingNumber trackingUrl');

  // Filter delivery notes visible to customer
  const publicShipments = shipments.map((s) => ({
    ...s.toObject(),
    deliveryNotes: (s.deliveryNotes || []).filter((n) => n.visibleToCustomer),
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

  const vendorOrders = await VendorOrder.find({ masterOrder: order._id })
    .select('orderNumber deliveryType status structbayLogistics')
    .populate('vendor', 'companyName name')
    .lean();

  const deliveryLines = (vendorOrders || []).map((vo) => ({
    orderNumber: vo.orderNumber,
    deliveryType: vo.deliveryType,
    deliveryTypeLabel:
      vo.deliveryType === 'structbay_delivery'
        ? 'Type B — Structbay delivery'
        : 'Type A — Vendor delivery',
    vendorLabel: vo.vendor?.companyName || vo.vendor?.name || 'Vendor',
    status: vo.status,
    structbayLogistics:
      vo.deliveryType === 'structbay_delivery' ? vo.structbayLogistics || null : null,
  }));

  const derivedStatus = deriveMasterStatusFromVendorOrders(vendorOrders);
  const progressSource = derivedStatus
    ? { ...order.toObject(), status: derivedStatus }
    : order.toObject();

  return ApiResponse.success(res, 200, 'Tracking retrieved.', {
    order: {
      orderNumber: order.orderNumber,
      status: derivedStatus || order.status,
      createdAt: order.createdAt,
      statusHistory: order.statusHistory,
      city: order.city,
      deliveryDetails: order.deliveryDetails,
      customerProgress: customerOrderProgress(progressSource),
    },
    deliveryLines,
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

// ─── GET /customer/orders/:id/invoices ─────────────────────────────────────────
/** PDFs / documents the customer may download (Structbay invoice, e-way, vendor tax invoices). */
exports.getOrderInvoices = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .select('orderNumber structbayInvoiceUrl invoiceUrl ewayBillUrl customerInvoiceNumber ewayBillNumber');
  if (!order) throw new AppError('Order not found.', 404);

  const files = await listOrderInvoiceFiles(order);
  const out = files.map((f, index) => ({
    label: f.label,
    kind: f.kind,
    reference: f.reference,
    index,
  }));

  return ApiResponse.success(res, 200, 'Downloadable invoice files.', out);
});

// ─── GET /customer/orders/:id/invoices/:index/file ─────────────────────────────
/** Authenticated proxy download for Cloudinary / stored invoice PDFs. */
exports.downloadInvoiceFile = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .select('_id orderNumber structbayInvoiceUrl invoiceUrl ewayBillUrl customerInvoiceNumber ewayBillNumber');
  if (!order) throw new AppError('Order not found.', 404);

  const files = await listOrderInvoiceFiles(order);
  const idx = parseInt(req.params.index, 10);
  if (!Number.isFinite(idx) || idx < 0 || idx >= files.length) {
    throw new AppError('Invoice file not found.', 404);
  }

  const file = files[idx];
  const buffer = await fetchInvoiceFileBuffer(file);
  const name = safeFilename(file.label, file.reference || order.orderNumber);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.status(200).send(buffer);
});

// ─── GET /customer/orders/:id/invoice-summary ─────────────────────────────────
/** Themed HTML order summary for customer download (acknowledgement / provisional invoice). */
exports.downloadInvoiceSummary = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('city', 'name state')
    .populate('items.product', 'name sku')
    .populate('items.variation', 'attributes sku');
  if (!order) throw new AppError('Order not found.', 404);

  const html = buildOrderAcknowledgementHtml(order);
  const safeName = `Structbay-order-${String(order.orderNumber || 'order').replace(/[^\w.-]+/g, '_')}.html`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  return res.status(200).send(html);
});

// ─── GET /customer/orders/:id/invoice-pdf ───────────────────────────────────────
/** PDF order summary with Structbay logo for customer download. */
exports.downloadInvoicePdf = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('city', 'name state')
    .populate('items.product', 'name sku')
    .populate('items.variation', 'attributes sku');
  if (!order) throw new AppError('Order not found.', 404);

  const pdf = await buildOrderAcknowledgementPdf(order);
  const safeName = `Structbay-order-${String(order.orderNumber || 'order').replace(/[^\w.-]+/g, '_')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.setHeader('Content-Length', pdf.length);
  return res.status(200).send(pdf);
});

// ─── PATCH /customer/orders/:id/cancel ───────────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);

  if (!CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES.includes(order.status)) {
    throw new AppError(
      order.status === 'READY_FOR_DISPATCH'
        ? 'Order cannot be cancelled once it is Ready for Dispatch. Contact Structbay support.'
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
      'Order cannot be cancelled after the vendor has marked it Ready for Dispatch. Contact Structbay support.',
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

  const prev = order.status;
  order.status = 'CANCELLED';
  order.statusHistory.push({ status: 'CANCELLED', changedBy: req.user._id, note: req.body.reason || 'Cancelled by customer.' });
  await order.save();

  // Release reserved inventory (pre–ready-for-dispatch cancellation)
  if (CUSTOMER_CANCELLABLE_MASTER_ORDER_STATUSES.includes(prev)) {
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
