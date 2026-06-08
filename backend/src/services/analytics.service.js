const Order              = require('../models/Order');
const User               = require('../models/User');
const Vendor             = require('../models/Vendor');
const Product            = require('../models/Product');
const PaymentTransaction = require('../models/PaymentTransaction');
const BulkEnquiry        = require('../models/BulkEnquiry');
const ConcreteRFQ        = require('../models/ConcreteRFQ');
const AnalyticsSnapshot  = require('../models/AnalyticsSnapshot');

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const startOfDay  = (d) => new Date(new Date(d).setHours(0, 0, 0, 0));
const endOfDay    = (d) => new Date(new Date(d).setHours(23, 59, 59, 999));

const buildDateFilter = (from, to, field = 'createdAt') => {
  if (!from && !to) return {};
  const filter = { [field]: {} };
  if (from) filter[field].$gte = startOfDay(from);
  if (to)   filter[field].$lte = endOfDay(to);
  return filter;
};

const groupFormat = (period) => {
  const fmts = {
    daily:     { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
    weekly:    { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
    monthly:   { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
    quarterly: {
      year: { $year: '$createdAt' },
      quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } },
    },
    yearly:    { year: { $year: '$createdAt' } },
  };
  return fmts[period] || fmts.monthly;
};

const growthPct = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
};

// ─── Write Daily Snapshot ────────────────────────────────────────────────────
const writeDailySnapshot = async (dateArg) => {
  const date  = startOfDay(dateArg || new Date());
  const match = { createdAt: { $gte: date, $lte: endOfDay(date) } };

  const [
    ordersAgg, newCustomers, totalCustomers, totalVendors,
    activeVendors, totalProducts, bulkEnq, rfqEnq, payments,
  ] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        total:     { $sum: 1 },
        revenue:   { $sum: '$grandTotal' },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } },
      }},
    ]),
    User.countDocuments({ ...match, role: 'CUSTOMER' }),
    User.countDocuments({ role: 'CUSTOMER' }),
    Vendor.countDocuments({}),
    Vendor.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'ACTIVE' }),
    BulkEnquiry.countDocuments(match),
    ConcreteRFQ.countDocuments(match),
    PaymentTransaction.aggregate([
      { $match: { ...match, status: 'PAID' } },
      { $group: { _id: null, collected: { $sum: '$amount' } } },
    ]),
  ]);

  const ord  = ordersAgg[0] || {};
  const snap = {
    date,
    snapshotType: 'daily',
    orders: {
      total:         ord.total         || 0,
      revenue:       ord.revenue       || 0,
      cancelled:     ord.cancelled     || 0,
      delivered:     ord.delivered     || 0,
      avgOrderValue: ord.total ? Math.round((ord.revenue || 0) / ord.total) : 0,
    },
    customers: { total: totalCustomers, newToday: newCustomers },
    vendors:   { total: totalVendors,   active:   activeVendors },
    products:  { total: totalProducts,  active:   totalProducts },
    enquiries: { bulk: bulkEnq, rfq: rfqEnq, converted: 0 },
    payments:  { collected: payments[0]?.collected || 0, refunded: 0 },
  };

  await AnalyticsSnapshot.findOneAndUpdate(
    { date, snapshotType: 'daily' },
    snap,
    { upsert: true }
  );
  return snap;
};

module.exports = { buildDateFilter, groupFormat, growthPct, startOfDay, endOfDay, writeDailySnapshot };
