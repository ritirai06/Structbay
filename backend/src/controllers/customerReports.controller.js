const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const User         = require('../models/User');
const Order        = require('../models/Order');
const { buildDateFilter, groupFormat } = require('../services/analytics.service');

// ─── GET /reports/customers/summary ──────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [total, newCustomers, activeCustomers] = await Promise.all([
    User.countDocuments({ role: 'CUSTOMER' }),
    User.countDocuments({ role: 'CUSTOMER', ...dateFilter }),
    // Active = placed order in period
    Order.distinct('customer', { ...dateFilter, status: { $ne: 'CANCELLED' } }).then((ids) => ids.length),
  ]);

  // Repeat customers: placed more than 1 order ever
  const repeatAgg = await Order.aggregate([
    { $group: { _id: '$customer', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'total' },
  ]);
  const repeatCustomers = repeatAgg[0]?.total || 0;

  return ApiResponse.success(res, 200, 'Customer summary.', {
    total, newCustomers, activeCustomers, repeatCustomers,
    inactiveCustomers: total - activeCustomers,
  });
});

// ─── GET /reports/customers/top ──────────────────────────────────────────────
exports.topCustomers = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, paymentStatus: 'PAID' } },
    { $group: {
      _id:         '$customer',
      totalSpend:  { $sum: '$grandTotal' },
      orderCount:  { $sum: 1 },
      avgOrder:    { $avg: '$grandTotal' },
      lastOrder:   { $max: '$createdAt' },
    }},
    { $sort: { totalSpend: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'customer' } },
    { $unwind: { path: '$customer', preserveNullAndEmpty: true } },
    { $project: {
      totalSpend: 1, orderCount: 1, avgOrder: 1, lastOrder: 1,
      'customer.name': 1, 'customer.email': 1, 'customer.phone': 1, 'customer.createdAt': 1,
    }},
  ]);

  return ApiResponse.success(res, 200, 'Top customers by spend.', data);
});

// ─── GET /reports/customers/growth ───────────────────────────────────────────
exports.growth = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const groupBy    = groupFormat(period);

  const data = await User.aggregate([
    { $match: { role: 'CUSTOMER', ...dateFilter } },
    { $group: { _id: groupBy, newCustomers: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  return ApiResponse.success(res, 200, `Customer growth (${period}).`, data);
});

// ─── GET /reports/customers/clv ───────────────────────────────────────────────
// Customer Lifetime Value — average total spend per customer
exports.clv = asyncHandler(async (req, res) => {
  const agg = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $group: { _id: '$customer', totalSpend: { $sum: '$grandTotal' } } },
    { $group: { _id: null, avgCLV: { $avg: '$totalSpend' }, maxCLV: { $max: '$totalSpend' }, minCLV: { $min: '$totalSpend' } } },
  ]);
  return ApiResponse.success(res, 200, 'Customer Lifetime Value.', agg[0] || { avgCLV: 0, maxCLV: 0, minCLV: 0 });
});

// ─── GET /reports/customers/purchase-frequency ───────────────────────────────
exports.purchaseFrequency = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, paymentStatus: 'PAID' } },
    { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
    { $group: {
      _id:   '$orderCount',
      customers: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
    { $project: { orderCount: '$_id', customers: 1, _id: 0 } },
  ]);

  return ApiResponse.success(res, 200, 'Customer purchase frequency.', data);
});

// ─── GET /reports/customers/retention ────────────────────────────────────────
// Returning customers per month
exports.retention = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $group: {
      _id:   { customer: '$customer', month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
      count: { $sum: 1 },
    }},
    { $group: {
      _id:       { month: '$_id.month', year: '$_id.year' },
      returning: { $sum: { $cond: [{ $gt: ['$count', 1] }, 1, 0] } },
      total:     { $sum: 1 },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
  return ApiResponse.success(res, 200, 'Customer retention.', data);
});
