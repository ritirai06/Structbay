const asyncHandler   = require('../utils/asyncHandler');
const ApiResponse    = require('../utils/apiResponse');
const Order          = require('../models/Order');
const VendorOrder    = require('../models/VendorOrder');
const Shipment       = require('../models/Shipment');
const OrderDocument  = require('../models/OrderDocument');

const dateFilter = (from, to) => {
  const f = {};
  if (from) f.$gte = new Date(from);
  if (to)   f.$lte = new Date(to);
  return Object.keys(f).length ? f : undefined;
};

// ─── GET /reports/orders/summary ─────────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const createdAt = dateFilter(dateFrom, dateTo);
  const base = createdAt ? { createdAt } : {};

  const statuses = ['PENDING','PAID','VENDOR_ASSIGNMENT_PENDING','PROCESSING','READY_FOR_DISPATCH',
    'PARTIALLY_DISPATCHED','DISPATCHED','PARTIALLY_DELIVERED','DELIVERED','COMPLETED','CANCELLED'];

  const [total, ...counts] = await Promise.all([
    Order.countDocuments(base),
    ...statuses.map((s) => Order.countDocuments({ ...base, status: s })),
  ]);

  const byStatus = {};
  statuses.forEach((s, i) => { byStatus[s] = counts[i]; });

  // Revenue
  const revenue = await Order.aggregate([
    { $match: { ...base, paymentStatus: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$grandTotal' } } },
  ]);

  return ApiResponse.success(res, 200, 'Order summary.', {
    total, byStatus, totalRevenue: revenue[0]?.total || 0,
  });
});

// ─── GET /reports/orders/vendor-fulfillment ────────────────────────────────────
exports.vendorFulfillment = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const createdAt = dateFilter(dateFrom, dateTo);
  const match = createdAt ? { createdAt } : {};

  const data = await VendorOrder.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$vendor',
        totalOrders:    { $sum: 1 },
        completed:      { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        cancelled:      { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
        avgDispatchDays:{ $avg: {
          $cond: [
            { $and: ['$assignedAt', '$actualDispatchDate'] },
            { $divide: [{ $subtract: ['$actualDispatchDate', '$assignedAt'] }, 86400000] },
            null,
          ],
        }},
      },
    },
    { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
    { $sort: { totalOrders: -1 } },
  ]);

  return ApiResponse.success(res, 200, 'Vendor fulfillment report.', data);
});

// ─── GET /reports/orders/city-wise ────────────────────────────────────────────
exports.cityWise = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const createdAt = dateFilter(dateFrom, dateTo);
  const match = createdAt ? { createdAt } : {};

  const data = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$city', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
    { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
    { $unwind: { path: '$city', preserveNullAndEmpty: true } },
    { $sort: { count: -1 } },
  ]);

  return ApiResponse.success(res, 200, 'City-wise orders.', data);
});

// ─── GET /reports/orders/category-wise ───────────────────────────────────────
exports.categoryWise = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const createdAt = dateFilter(dateFrom, dateTo);
  const match = createdAt ? { createdAt } : {};

  const data = await Order.aggregate([
    { $match: { ...match, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products', localField: 'items.product', foreignField: '_id', as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmpty: true } },
    {
      $group: {
        _id:      '$product.category',
        count:    { $sum: 1 },
        quantity: { $sum: '$items.quantity' },
        revenue:  { $sum: '$items.lineTotal' },
      },
    },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmpty: true } },
    { $sort: { revenue: -1 } },
  ]);

  return ApiResponse.success(res, 200, 'Category-wise orders.', data);
});

// ─── GET /reports/orders/invoice-status ──────────────────────────────────────
exports.invoiceStatus = asyncHandler(async (req, res) => {
  const data = await VendorOrder.aggregate([
    { $group: {
      _id: '$invoiceStatus',
      count: { $sum: 1 },
    }},
    { $sort: { count: -1 } },
  ]);
  return ApiResponse.success(res, 200, 'Invoice status report.', data);
});

// ─── GET /reports/orders/dispatch-performance ─────────────────────────────────
exports.dispatchPerformance = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const createdAt = dateFilter(dateFrom, dateTo);
  const match = { ...(createdAt ? { createdAt } : {}), actualDispatchDate: { $ne: null } };

  const data = await VendorOrder.aggregate([
    { $match: match },
    { $project: {
      vendor: 1,
      dispatchDays: { $divide: [{ $subtract: ['$actualDispatchDate', '$assignedAt'] }, 86400000] },
      onTime: { $cond: [
        { $lte: ['$actualDispatchDate', '$expectedDispatchDate'] }, 1, 0
      ]},
    }},
    { $group: {
      _id: '$vendor',
      avgDispatchDays: { $avg: '$dispatchDays' },
      onTimeCount:     { $sum: '$onTime' },
      total:           { $sum: 1 },
    }},
    { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
    { $sort: { avgDispatchDays: 1 } },
  ]);

  return ApiResponse.success(res, 200, 'Dispatch performance report.', data);
});
