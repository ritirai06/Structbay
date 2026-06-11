const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const { logAction } = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');

const generateOrderNumber = () => generateRefNumber('ORDER');

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
    .populate('items.variation', 'attributes sku');
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

module.exports = { getAll, getById, create, updateStatus, assignVendor, uploadDocs, getStats };
