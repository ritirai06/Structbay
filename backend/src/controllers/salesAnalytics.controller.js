const asyncHandler  = require('../utils/asyncHandler');
const ApiResponse   = require('../utils/apiResponse');
const Order         = require('../models/Order');
const { buildDateFilter, groupFormat, growthPct, startOfDay, endOfDay } = require('../services/analytics.service');

// ─── GET /analytics/sales/summary ────────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [totalAgg, statusBreakdown] = await Promise.all([
    Order.aggregate([
      { $match: { ...dateFilter, paymentStatus: 'PAID' } },
      { $group: {
        _id:      null,
        revenue:  { $sum: '$grandTotal' },
        orders:   { $sum: 1 },
        gst:      { $sum: '$gstTotal' },
        subtotal: { $sum: '$subtotal' },
        discount: { $sum: '$discount' },
      }},
    ]),
    Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const agg = totalAgg[0] || {};
  return ApiResponse.success(res, 200, 'Sales summary.', {
    revenue:    Math.round(agg.revenue   || 0),
    orders:     agg.orders  || 0,
    gstTotal:   Math.round(agg.gst      || 0),
    subtotal:   Math.round(agg.subtotal || 0),
    discount:   Math.round(agg.discount || 0),
    avgOrderValue: agg.orders ? Math.round((agg.revenue || 0) / agg.orders) : 0,
    statusBreakdown,
  });
});

// ─── GET /analytics/sales/trend ──────────────────────────────────────────────
exports.trend = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const groupBy    = groupFormat(period);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, paymentStatus: 'PAID' } },
    { $group: {
      _id:     groupBy,
      revenue: { $sum: '$grandTotal' },
      orders:  { $sum: 1 },
      gst:     { $sum: '$gstTotal' },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
  ]);

  return ApiResponse.success(res, 200, `Sales trend (${period}).`, data);
});

// ─── GET /analytics/sales/top-products ───────────────────────────────────────
exports.topProducts = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 10 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    { $group: {
      _id:      '$items.product',
      name:     { $first: '$items.name' },
      sku:      { $first: '$items.sku' },
      quantity: { $sum: '$items.quantity' },
      revenue:  { $sum: '$items.lineTotal' },
      orders:   { $sum: 1 },
    }},
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Top products by revenue.', data);
});

// ─── GET /analytics/sales/top-cities ─────────────────────────────────────────
exports.topCities = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 10 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
    { $group: {
      _id:     '$city',
      revenue: { $sum: '$grandTotal' },
      orders:  { $sum: 1 },
    }},
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
    { $unwind: { path: '$city', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Top cities by revenue.', data);
});

// ─── GET /analytics/sales/top-categories ─────────────────────────────────────
exports.topCategories = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 10 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: { path: '$prod', preserveNullAndEmpty: true } },
    { $group: {
      _id:      '$prod.category',
      revenue:  { $sum: '$items.lineTotal' },
      quantity: { $sum: '$items.quantity' },
      orders:   { $sum: 1 },
    }},
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Top categories by revenue.', data);
});

// ─── GET /analytics/sales/comparison ──────────────────────────────────────────
exports.comparison = asyncHandler(async (req, res) => {
  const { year1 = new Date().getFullYear() - 1, year2 = new Date().getFullYear() } = req.query;

  const buildYearData = async (year) =>
    Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59`) } } },
      { $group: { _id: { month: { $month: '$createdAt' } }, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]);

  const [y1, y2] = await Promise.all([buildYearData(year1), buildYearData(year2)]);

  const fill = (data, y) =>
    Array.from({ length: 12 }, (_, i) => {
      const found = data.find((d) => d._id.month === i + 1);
      return { month: i + 1, year: y, revenue: found?.revenue || 0, orders: found?.orders || 0 };
    });

  return ApiResponse.success(res, 200, 'Year-over-year comparison.', {
    [year1]: fill(y1, year1),
    [year2]: fill(y2, year2),
  });
});
