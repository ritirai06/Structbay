const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const Shipment     = require('../models/Shipment');
const VendorOrder  = require('../models/VendorOrder');
const Order        = require('../models/Order');
const { buildDateFilter } = require('../services/analytics.service');

// ─── GET /reports/delivery/summary ───────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [agg] = await Shipment.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:         null,
      total:       { $sum: 1 },
      delivered:   { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] },        1, 0] } },
      failed:      { $sum: { $cond: [{ $eq: ['$status', 'FAILED_DELIVERY'] },  1, 0] } },
      returned:    { $sum: { $cond: [{ $eq: ['$status', 'RETURNED'] },         1, 0] } },
      inTransit:   { $sum: { $cond: [{ $eq: ['$status', 'IN_TRANSIT'] },       1, 0] } },
      pending:     { $sum: { $cond: [{ $in: ['$status', ['CREATED', 'PICKUP_SCHEDULED']] }, 1, 0] } },
    }},
  ]);

  const stats = agg || { total: 0, delivered: 0, failed: 0, returned: 0, inTransit: 0, pending: 0 };
  stats.successRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100 * 10) / 10 : 0;

  return ApiResponse.success(res, 200, 'Delivery summary.', stats);
});

// ─── GET /reports/delivery/on-time ───────────────────────────────────────────
exports.onTime = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo, 'actualDelivery');

  const data = await Shipment.aggregate([
    { $match: { ...dateFilter, status: 'DELIVERED', actualDelivery: { $ne: null }, estimatedDelivery: { $ne: null } } },
    { $project: {
      logisticsPartner: 1,
      onTime:   { $cond: [{ $lte: ['$actualDelivery', '$estimatedDelivery'] }, 1, 0] },
      late:     { $cond: [{ $gt:  ['$actualDelivery', '$estimatedDelivery'] }, 1, 0] },
      daysDiff: { $divide: [{ $subtract: ['$actualDelivery', '$estimatedDelivery'] }, 86400000] },
    }},
    { $group: {
      _id:     null,
      total:   { $sum: 1 },
      onTime:  { $sum: '$onTime' },
      late:    { $sum: '$late' },
      avgDelay:{ $avg: { $cond: [{ $gt: ['$daysDiff', 0] }, '$daysDiff', null] } },
    }},
    { $addFields: { onTimeRate: { $cond: ['$total', { $multiply: [{ $divide: ['$onTime', '$total'] }, 100] }, 0] } } },
  ]);

  return ApiResponse.success(res, 200, 'On-time delivery report.', data[0] || {});
});

// ─── GET /reports/delivery/partner-performance ───────────────────────────────
exports.partnerPerformance = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Shipment.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:       '$logisticsPartner',
      total:     { $sum: 1 },
      delivered: { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] },       1, 0] } },
      failed:    { $sum: { $cond: [{ $eq: ['$status', 'FAILED_DELIVERY'] }, 1, 0] } },
      avgDays:   { $avg: {
        $cond: [
          { $and: ['$actualDelivery', '$createdAt'] },
          { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, 86400000] },
          null,
        ],
      }},
    }},
    { $addFields: { successRate: { $cond: ['$total', { $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 0] } } },
    { $sort: { successRate: -1 } },
  ]);

  return ApiResponse.success(res, 200, 'Delivery partner performance.', data);
});

// ─── GET /reports/delivery/vendor-wise ───────────────────────────────────────
exports.vendorWise = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await VendorOrder.aggregate([
    { $match: { ...dateFilter, deliveryType: 'vendor_delivery' } },
    { $group: {
      _id:       '$vendor',
      total:     { $sum: 1 },
      delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'COMPLETED']] }, 1, 0] } },
      avgDays:   { $avg: {
        $cond: [
          { $and: ['$actualDeliveryDate', '$actualDispatchDate'] },
          { $divide: [{ $subtract: ['$actualDeliveryDate', '$actualDispatchDate'] }, 86400000] },
          null,
        ],
      }},
    }},
    { $addFields: { deliveryRate: { $cond: ['$total', { $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 0] } } },
    { $sort: { deliveryRate: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
    { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Vendor delivery performance.', data);
});

// ─── GET /reports/delivery/city-wise ─────────────────────────────────────────
exports.cityWise = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:       '$city',
      total:     { $sum: 1 },
      delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'COMPLETED']] }, 1, 0] } },
      cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
    }},
    { $addFields: { deliveryRate: { $cond: ['$total', { $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 0] } } },
    { $sort: { deliveryRate: -1 } },
    { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
    { $unwind: { path: '$city', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'City-wise delivery report.', data);
});
