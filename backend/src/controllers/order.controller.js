const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const { logAction } = require('../services/auditLog.service');
const { generateMasterOrderNumber } = require('../services/order.service');

const generateOrderNumber = () => generateMasterOrderNumber();

const getAll = asyncHandler(async (req, res) => {
  const { status, city, vendor, customer, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (city) filter.city = city;
  if (vendor) filter.assignedVendor = vendor;
  if (customer) filter.customer = customer;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('city', 'name state')
      .populate('assignedVendor', 'name companyName')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Orders retrieved.', orders, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('city', 'name state')
    .populate('assignedVendor', 'name companyName')
    .populate('items.product', 'name sku images')
    .populate('items.variation', 'attributes sku')
    .populate({ path: 'vendorOrders', select: 'orderNumber deliveryType status invoiceStatus structbayLogistics vendor totalAmount' });
  if (!order) throw new AppError('Order not found.', 404);
  return ApiResponse.success(res, 200, 'Order retrieved.', order);
});

const create = asyncHandler(async (req, res) => {
  const orderNumber = await generateOrderNumber();
  const order = await Order.create({ ...req.body, orderNumber });
  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'Order', targetId: order._id.toString(),
    description: `Created order: ${orderNumber}`, ipAddress: req.ip });
  return ApiResponse.created(res, 'Order created.', order);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  const oldStatus = order.status;
  order.status = status;
  order.statusHistory.push({ status, changedBy: req.user._id, note });
  await order.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order', targetId: order._id.toString(),
    description: `Status: ${oldStatus} → ${status}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Order status updated.', order);
});

const assignVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  order.assignedVendor = vendorId;
  await order.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order', targetId: order._id.toString(),
    description: `Assigned vendor: ${vendorId}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Vendor assigned.', order);
});

const patchOrderDetails = asyncHandler(async (req, res) => {
  const allowed = ['deliveryDetails', 'adminNotes', 'notes', 'shippingAddress'];
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) order[f] = req.body[f];
  });
  await order.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Order', targetId: order._id.toString(),
    description: 'Order details / delivery notes updated.', ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Order updated.', order);
});

const uploadDocs = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);
  if (req.body.invoiceUrl) order.invoiceUrl = req.body.invoiceUrl;
  if (req.body.ewayBillUrl) order.ewayBillUrl = req.body.ewayBillUrl;
  await order.save();
  return ApiResponse.success(res, 200, 'Documents uploaded.', order);
});

const getStats = asyncHandler(async (req, res) => {
  const [total, pending, processing, dispatched, delivered, cancelled] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'PENDING' }),
    Order.countDocuments({ status: 'PROCESSING' }),
    Order.countDocuments({ status: 'DISPATCHED' }),
    Order.countDocuments({ status: 'DELIVERED' }),
    Order.countDocuments({ status: 'CANCELLED' }),
  ]);
  return ApiResponse.success(res, 200, 'Order stats.', { total, pending, processing, dispatched, delivered, cancelled });
});

const invoiceListFilter = () => ({
  status: { $nin: ['CANCELLED', 'RETURNED'] },
  $or: [
    { paymentStatus: 'PAID' },
    { structbayInvoiceUrl: { $nin: [null, ''] } },
    { invoiceUrl: { $nin: [null, ''] } },
    { customerInvoiceNumber: { $nin: [null, ''] } },
  ],
});

const listInvoices = asyncHandler(async (req, res) => {
  const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limitNum = Math.min(100, parseInt(req.query.limit, 10) || 25);
  const filter = invoiceListFilter();

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const rows = orders.map((o) => {
    const pdfUrl = o.structbayInvoiceUrl || o.invoiceUrl || null;
    const hasPdf = !!(pdfUrl && String(pdfUrl).trim());
    let displayStatus = 'Pending';
    if (hasPdf) displayStatus = 'Issued';
    else if (o.paymentStatus === 'PAID') displayStatus = 'Paid';
    else if (o.paymentStatus === 'PENDING') displayStatus = 'Payment pending';

    return {
      _id: o._id,
      invoiceLabel: o.customerInvoiceNumber || o.orderNumber,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || '—',
      subtotal: o.subtotal,
      gstTotal: o.gstTotal,
      grandTotal: o.grandTotal,
      paymentStatus: o.paymentStatus,
      displayStatus,
      pdfUrl,
      updatedAt: o.updatedAt,
    };
  });

  return ApiResponse.success(res, 200, 'Invoices retrieved.', rows, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
});

const invoiceSummary = asyncHandler(async (req, res) => {
  const base = { status: { $nin: ['CANCELLED', 'RETURNED'] } };
  const [totalRows, paidAgg, pendingAgg, withPdf] = await Promise.all([
    Order.countDocuments(invoiceListFilter()),
    Order.aggregate([
      { $match: { ...base, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.aggregate([
      { $match: { ...base, paymentStatus: 'PENDING' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.countDocuments({
      ...base,
      $or: [
        { structbayInvoiceUrl: { $nin: [null, ''] } },
        { invoiceUrl: { $nin: [null, ''] } },
      ],
    }),
  ]);

  return ApiResponse.success(res, 200, 'Invoice summary.', {
    totalRows,
    ordersWithPdf: withPdf,
    pendingPaymentAmount: pendingAgg[0]?.total || 0,
    totalCollectedAmount: paidAgg[0]?.total || 0,
  });
});

module.exports = {
  getAll,
  getById,
  create,
  updateStatus,
  assignVendor,
  uploadDocs,
  getStats,
  patchOrderDetails,
  listInvoices,
  invoiceSummary,
};
