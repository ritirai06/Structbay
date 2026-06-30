const asyncHandler       = require('../utils/asyncHandler');
const ApiResponse        = require('../utils/apiResponse');
const PaymentTransaction = require('../models/PaymentTransaction');
const Order              = require('../models/Order');
const OrderDocument      = require('../models/OrderDocument');
const { buildDateFilter, groupFormat } = require('../services/analytics.service');

// ─── GET /reports/payments/summary ───────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [agg, statusBreakdown] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: dateFilter },
      { $group: {
        _id:       null,
        totalCollected: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] },     '$amount',       0] } },
        totalFailed:    { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] },   '$amount',       0] } },
        totalRefunded:  { $sum: { $cond: [{ $eq: ['$status', 'REFUNDED'] }, '$refundAmount', 0] } },
        totalPending:   { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] },  '$amount',       0] } },
        countPaid:      { $sum: { $cond: [{ $eq: ['$status', 'PAID'] },     1, 0] } },
        countFailed:    { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] },   1, 0] } },
        countRefunded:  { $sum: { $cond: [{ $eq: ['$status', 'REFUNDED'] }, 1, 0] } },
        total:          { $sum: 1 },
      }},
    ]),
    PaymentTransaction.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Payment summary.', { ...(agg[0] || {}), statusBreakdown });
});

// ─── GET /reports/payments/trend ─────────────────────────────────────────────
exports.trend = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const groupBy    = groupFormat(period);

  const data = await PaymentTransaction.aggregate([
    { $match: { ...dateFilter, status: 'PAID' } },
    { $group: {
      _id:       groupBy,
      revenue:   { $sum: '$amount' },
      count:     { $sum: 1 },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  return ApiResponse.success(res, 200, `Payment trend (${period}).`, data);
});

// ─── GET /reports/payments/gst ────────────────────────────────────────────────
exports.gstReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, period = 'monthly' } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const groupBy    = groupFormat(period);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, paymentStatus: 'PAID' } },
    { $group: {
      _id:        groupBy,
      subtotal:   { $sum: '$subtotal' },
      gst:        { $sum: '$gstTotal' },
      grandTotal: { $sum: '$grandTotal' },
      orders:     { $sum: 1 },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return ApiResponse.success(res, 200, `GST report (${period}).`, data);
});

// ─── GET /reports/payments/method-wise ───────────────────────────────────────
exports.methodWise = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await PaymentTransaction.aggregate([
    { $match: { ...dateFilter, status: 'PAID' } },
    { $group: {
      _id:     '$paymentMethod',
      revenue: { $sum: '$amount' },
      count:   { $sum: 1 },
    }},
    { $sort: { revenue: -1 } },
  ]);

  return ApiResponse.success(res, 200, 'Payment method-wise split.', data);
});

// ─── GET /reports/payments/refunds ───────────────────────────────────────────
exports.refunds = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, page = 1, limit = 50 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo, 'refundedAt');
  const pageNum    = Math.max(1, parseInt(page));
  const limitNum   = Math.min(200, parseInt(limit));

  const filter = { status: 'REFUNDED', ...dateFilter };
  const [txns, total, totalRefunded] = await Promise.all([
    PaymentTransaction.find(filter)
      .populate('masterOrder', 'orderNumber')
      .populate('customer', 'name email')
      .sort({ refundedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    PaymentTransaction.countDocuments(filter),
    PaymentTransaction.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Refund report.', txns, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
    totalRefundedAmount: totalRefunded[0]?.total || 0,
  });
});

// ─── GET /reports/payments/invoices ──────────────────────────────────────────
exports.invoiceStatus = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await OrderDocument.aggregate([
    { $match: { ...dateFilter, documentType: { $in: ['Structbay_INVOICE', 'VENDOR_INVOICE', 'TAX_INVOICE', 'EWAY_BILL'] } } },
    { $group: {
      _id:    { type: '$documentType', status: '$status' },
      count:  { $sum: 1 },
    }},
    { $sort: { '_id.type': 1 } },
  ]);

  return ApiResponse.success(res, 200, 'Invoice status report.', data);
});
