const asyncHandler  = require('../utils/asyncHandler');
const ApiResponse   = require('../utils/apiResponse');
const BulkEnquiry   = require('../models/BulkEnquiry');
const ConcreteRFQ   = require('../models/ConcreteRFQ');
const { buildDateFilter, groupFormat } = require('../services/analytics.service');

// ─── GET /reports/enquiries/bulk-summary ─────────────────────────────────────
exports.bulkSummary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [total, breakdown, converted] = await Promise.all([
    BulkEnquiry.countDocuments(dateFilter),
    BulkEnquiry.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    BulkEnquiry.countDocuments({ ...dateFilter, status: 'CONVERTED' }),
  ]);

  return ApiResponse.success(res, 200, 'Bulk enquiry summary.', {
    total,
    conversionRate: total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0,
    breakdown,
  });
});

// ─── GET /reports/enquiries/bulk-trend ───────────────────────────────────────
exports.bulkTrend = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const groupBy    = groupFormat(period);

  const data = await BulkEnquiry.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:       groupBy,
      total:     { $sum: 1 },
      converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  return ApiResponse.success(res, 200, `Bulk enquiry trend (${period}).`, data);
});

// ─── GET /reports/enquiries/rfq-summary ──────────────────────────────────────
exports.rfqSummary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [total, breakdown, converted] = await Promise.all([
    ConcreteRFQ.countDocuments(dateFilter),
    ConcreteRFQ.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ConcreteRFQ.countDocuments({ ...dateFilter, status: 'CONVERTED' }),
  ]);

  const gradeBreakdown = await ConcreteRFQ.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$grade', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } },
    { $sort: { count: -1 } },
  ]);

  return ApiResponse.success(res, 200, 'Concrete RFQ summary.', {
    total,
    conversionRate: total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0,
    breakdown,
    gradeBreakdown,
  });
});

// ─── GET /reports/enquiries/rfq-trend ────────────────────────────────────────
exports.rfqTrend = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const groupBy    = groupFormat(period);

  const data = await ConcreteRFQ.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:       groupBy,
      total:     { $sum: 1 },
      converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return ApiResponse.success(res, 200, `RFQ trend (${period}).`, data);
});
