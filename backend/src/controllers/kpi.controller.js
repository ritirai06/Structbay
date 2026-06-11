const asyncHandler       = require('../utils/asyncHandler');
const ApiResponse        = require('../utils/apiResponse');
const Order              = require('../models/Order');
const User               = require('../models/User');
const Vendor             = require('../models/Vendor');
const Product            = require('../models/Product');
const BulkEnquiry        = require('../models/BulkEnquiry');
const ConcreteRFQ        = require('../models/ConcreteRFQ');
const PaymentTransaction = require('../models/PaymentTransaction');
const VendorOrder        = require('../models/VendorOrder');
const AnalyticsSnapshot  = require('../models/AnalyticsSnapshot');
const { buildDateFilter, groupFormat, growthPct, startOfDay, endOfDay } = require('../services/analytics.service');

// ─── GET /analytics/kpi ───────────────────────────────────────────────────────
exports.getKPI = asyncHandler(async (req, res) => {
  const now   = new Date();
  const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const prevStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevEnd   = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));

  const thisMonth = { createdAt: { $gte: start, $lte: now } };
  const lastMonth = { createdAt: { $gte: prevStart, $lte: prevEnd } };

  const [
    totalOrders, totalCustomers, totalVendors, totalProducts,
    totalBulkEnquiries, totalRFQs,
    thisRevAgg, lastRevAgg,
    thisOrderCount, lastOrderCount,
    pendingOrders, deliveredOrders, cancelledOrders,
    paidTxns, refundedTxns,
    vendorOrdersAssigned,
  ] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'CUSTOMER' }),
    Vendor.countDocuments(),
    Product.countDocuments({ status: 'ACTIVE' }),
    BulkEnquiry.countDocuments(),
    ConcreteRFQ.countDocuments(),
    Order.aggregate([{ $match: { ...thisMonth, paymentStatus: 'PAID' } }, { $group: { _id: null, rev: { $sum: '$grandTotal' } } }]),
    Order.aggregate([{ $match: { ...lastMonth, paymentStatus: 'PAID' } }, { $group: { _id: null, rev: { $sum: '$grandTotal' } } }]),
    Order.countDocuments(thisMonth),
    Order.countDocuments(lastMonth),
    Order.countDocuments({ status: { $in: ['PENDING', 'VENDOR_ASSIGNMENT_PENDING', 'PROCESSING'] } }),
    Order.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] } }),
    Order.countDocuments({ status: 'CANCELLED' }),
    PaymentTransaction.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    PaymentTransaction.aggregate([{ $match: { status: 'REFUNDED' } }, { $group: { _id: null, total: { $sum: '$refundAmount' } } }]),
    VendorOrder.countDocuments(),
  ]);

  const thisRevenue = thisRevAgg[0]?.rev || 0;
  const lastRevenue = lastRevAgg[0]?.rev || 0;
  const avgOrderValue = totalOrders > 0
    ? Math.round((paidTxns[0]?.total || 0) / totalOrders)
    : 0;

  // Conversion: paid orders / total orders
  const paidOrders = await Order.countDocuments({ paymentStatus: 'PAID' });
  const conversionRate = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100 * 10) / 10 : 0;

  return ApiResponse.success(res, 200, 'KPI dashboard data.', {
    totalRevenue:       paidTxns[0]?.total     || 0,
    totalOrders,
    totalCustomers,
    totalVendors,
    totalProducts,
    totalRFQs,
    totalBulkEnquiries,
    avgOrderValue,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    vendorOrdersAssigned,
    conversionRate,
    refundedAmount:    refundedTxns[0]?.total  || 0,
    growth: {
      revenueGrowthPct: growthPct(thisRevenue, lastRevenue),
      orderGrowthPct:   growthPct(thisOrderCount, lastOrderCount),
      thisMonthRevenue: Math.round(thisRevenue),
      lastMonthRevenue: Math.round(lastRevenue),
    },
  });
});

// ─── GET /analytics/kpi/monthly-trend ────────────────────────────────────────
exports.monthlyTrend = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const start = new Date(Number(year), 0, 1);
  const end   = new Date(Number(year), 11, 31, 23, 59, 59);

  const data = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: 'PAID' } },
    { $group: {
      _id:     { month: { $month: '$createdAt' } },
      revenue: { $sum: '$grandTotal' },
      orders:  { $sum: 1 },
    }},
    { $sort: { '_id.month': 1 } },
  ]);

  // Fill all 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const found = data.find((d) => d._id.month === i + 1);
    return { month: i + 1, revenue: found?.revenue || 0, orders: found?.orders || 0 };
  });

  return ApiResponse.success(res, 200, 'Monthly revenue trend.', { year, months });
});

// ─── GET /analytics/kpi/yearly-comparison ────────────────────────────────────
exports.yearlyComparison = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $group: {
      _id:     { year: { $year: '$createdAt' } },
      revenue: { $sum: '$grandTotal' },
      orders:  { $sum: 1 },
    }},
    { $sort: { '_id.year': 1 } },
  ]);
  return ApiResponse.success(res, 200, 'Yearly comparison.', data);
});

// ─── GET /analytics/kpi/snapshot ─────────────────────────────────────────────
exports.getSnapshots = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const from = new Date(Date.now() - Number(days) * 86400000);
  const snapshots = await AnalyticsSnapshot.find({
    date: { $gte: from }, snapshotType: 'daily',
  }).sort({ date: 1 });
  return ApiResponse.success(res, 200, 'Snapshots retrieved.', snapshots);
});
