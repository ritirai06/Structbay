const asyncHandler  = require('../utils/asyncHandler');
const ApiResponse   = require('../utils/apiResponse');
const Vendor        = require('../models/Vendor');
const VendorOrder   = require('../models/VendorOrder');
const VendorInvoice = require('../models/VendorInvoice');
const { buildDateFilter } = require('../services/analytics.service');

// ─── GET /reports/vendors/summary ────────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const [total, active, pending] = await Promise.all([
    Vendor.countDocuments(),
    Vendor.countDocuments({ status: 'active' }),
    Vendor.countDocuments({ verificationStatus: 'pending' }),
  ]);
  return ApiResponse.success(res, 200, 'Vendor summary.', { total, active, pending, inactive: total - active });
});

// ─── GET /reports/vendors/performance ────────────────────────────────────────
exports.performance = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await VendorOrder.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:          '$vendor',
      totalOrders:  { $sum: 1 },
      completed:    { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      delivered:    { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } },
      cancelled:    { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
      totalRevenue: { $sum: '$totalAmount' },
      invoiceVerified: { $sum: { $cond: [{ $eq: ['$invoiceStatus', 'VERIFIED'] }, 1, 0] } },
      invoicePending:  { $sum: { $cond: [{ $eq: ['$invoiceStatus', 'PENDING'] }, 1, 0] } },
      avgDispatchDays: { $avg: {
        $cond: [
          { $and: ['$assignedAt', '$actualDispatchDate'] },
          { $divide: [{ $subtract: ['$actualDispatchDate', '$assignedAt'] }, 86400000] },
          null,
        ],
      }},
    }},
    { $addFields: {
      fulfillmentRate:      { $cond: ['$totalOrders', { $multiply: [{ $divide: ['$completed', '$totalOrders'] }, 100] }, 0] },
      invoiceComplianceRate:{ $cond: ['$totalOrders', { $multiply: [{ $divide: ['$invoiceVerified', '$totalOrders'] }, 100] }, 0] },
    }},
    { $sort: { fulfillmentRate: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
    { $project: {
      totalOrders: 1, completed: 1, delivered: 1, cancelled: 1,
      totalRevenue: 1, fulfillmentRate: 1, invoiceComplianceRate: 1,
      avgDispatchDays: 1,
      'vendor.companyName': 1, 'vendor.contactPerson': 1, 'vendor.phone': 1,
    }},
  ]);

  return ApiResponse.success(res, 200, 'Vendor performance report.', data);
});

// ─── GET /reports/vendors/ranking ─────────────────────────────────────────────
exports.ranking = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await VendorOrder.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:         '$vendor',
      totalOrders: { $sum: 1 },
      completed:   { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      revenue:     { $sum: '$totalAmount' },
      onTime:      { $sum: {
        $cond: [
          { $and: ['$actualDispatchDate', '$expectedDispatchDate',
            { $lte: ['$actualDispatchDate', '$expectedDispatchDate'] }] },
          1, 0,
        ],
      }},
    }},
    { $addFields: {
      score: {
        $add: [
          { $multiply: [{ $cond: ['$totalOrders', { $divide: ['$completed', '$totalOrders'] }, 0] }, 70] },
          { $multiply: [{ $cond: ['$totalOrders', { $divide: ['$onTime',    '$totalOrders'] }, 0] }, 30] },
        ],
      },
    }},
    { $sort: { score: -1 } },
    { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
    { $project: {
      totalOrders: 1, completed: 1, revenue: 1, onTime: 1, score: 1,
      'vendor.companyName': 1, 'vendor.contactPerson': 1,
    }},
  ]);

  // Add rank
  const ranked = data.map((v, i) => ({ ...v, rank: i + 1 }));
  return ApiResponse.success(res, 200, 'Vendor ranking.', ranked);
});

// ─── GET /reports/vendors/sla ─────────────────────────────────────────────────
exports.sla = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await VendorOrder.aggregate([
    { $match: { ...dateFilter, actualDispatchDate: { $ne: null } } },
    { $project: {
      vendor: 1,
      dispatchDays: { $divide: [{ $subtract: ['$actualDispatchDate', '$assignedAt'] }, 86400000] },
      withinSLA:    { $cond: [{ $lte: ['$actualDispatchDate', '$expectedDispatchDate'] }, 1, 0] },
      breachedSLA:  { $cond: [{ $gt:  ['$actualDispatchDate', '$expectedDispatchDate'] }, 1, 0] },
    }},
    { $group: {
      _id:         '$vendor',
      avgDays:     { $avg: '$dispatchDays' },
      withinSLA:   { $sum: '$withinSLA' },
      breachedSLA: { $sum: '$breachedSLA' },
      total:       { $sum: 1 },
    }},
    { $addFields: { slaRate: { $cond: ['$total', { $multiply: [{ $divide: ['$withinSLA', '$total'] }, 100] }, 0] } } },
    { $sort: { slaRate: -1 } },
    { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Vendor SLA report.', data);
});

// ─── GET /reports/vendors/:id/own (vendor self-report) ────────────────────────
exports.ownReport = asyncHandler(async (req, res) => {
  const vendorId   = req.params.vendorId;
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [orders, revenue] = await Promise.all([
    VendorOrder.aggregate([
      { $match: { vendor: require('mongoose').Types.ObjectId(vendorId), ...dateFilter } },
      { $group: {
        _id:       '$status',
        count:     { $sum: 1 },
        amount:    { $sum: '$totalAmount' },
      }},
    ]),
    VendorOrder.aggregate([
      { $match: { vendor: require('mongoose').Types.ObjectId(vendorId), ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Vendor own report.', {
    breakdown: orders,
    totalRevenue: revenue[0]?.total  || 0,
    totalOrders:  revenue[0]?.orders || 0,
  });
});
