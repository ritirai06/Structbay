const VendorOrder = require('../models/VendorOrder');
const VendorNotification = require('../models/VendorNotification');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');
const { vendorOrderMatch } = require('../utils/vendorOrderAccess');
const { decorateVendorOrderForPortal } = require('../utils/vendorOrderPortal');

// @desc    Get Vendor Dashboard Stats
// @route   GET /api/v1/vendor/dashboard
exports.getDashboardStats = async (req, res) => {
  const match = await vendorOrderMatch(req.user);

  const [
    totalOrders, pendingOrders, readyForDispatch,
    inTransit, delivered, pendingInvoices,
    unreadNotifications, recentOrders, recentActivities, monthlyStats,
  ] = await Promise.all([
    VendorOrder.countDocuments(match),
    VendorOrder.countDocuments({ ...match, status: { $in: ['ASSIGNED', 'READY_FOR_DISPATCH', 'INVOICE_UPLOADED'] } }),
    VendorOrder.countDocuments({ ...match, status: 'READY_FOR_DISPATCH' }),
    VendorOrder.countDocuments({ ...match, status: { $in: ['PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } }),
    VendorOrder.countDocuments({ ...match, status: { $in: ['DELIVERED', 'COMPLETED'] } }),
    VendorOrder.countDocuments({ ...match, invoiceStatus: 'PENDING' }),
    VendorNotification.countDocuments({ vendor: req.user._id, isRead: false }),
    VendorOrder.find(match)
      .sort({ createdAt: -1 }).limit(10)
      .populate('items.product', 'name')
      .select('orderNumber status createdAt totalAmount deliveryAddress items priority'),
    VendorActivityLog.find({ vendor: req.user._id }).sort({ createdAt: -1 }).limit(10).select('action description createdAt'),
    VendorOrder.aggregate([
      { $match: { ...match, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'COMPLETED']] }, 1, 0] } },
        totalAmount: { $sum: '$totalAmount' },
      }},
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Dashboard stats retrieved.', {
    orderStats: { total: totalOrders, pending: pendingOrders, readyForDispatch, inTransit, delivered, pendingInvoices },
    monthlyFulfillment: monthlyStats[0] || { totalOrders: 0, completedOrders: 0, totalAmount: 0 },
    recentOrders: recentOrders.map((o) => decorateVendorOrderForPortal(o)),
    recentActivities,
    unreadNotifications,
  });
};

// @desc    Get Performance Analytics
// @route   GET /api/v1/vendor/dashboard/analytics
exports.getAnalytics = async (req, res) => {
  const match = await vendorOrderMatch(req.user);
  const { period = '30' } = req.query;
  const startDate = new Date(Date.now() - parseInt(period, 10) * 24 * 60 * 60 * 1000);

  const [ordersByStatus, ordersByDate, invoiceStats, dispatchStats, fulfillmentTime] = await Promise.all([
    VendorOrder.aggregate([
      { $match: { ...match, createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $match: { ...match, createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    VendorOrder.aggregate([
      { $match: { ...match, createdAt: { $gte: startDate } } },
      { $group: { _id: '$invoiceStatus', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $match: { ...match, createdAt: { $gte: startDate } } },
      { $group: { _id: '$dispatchStatus', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $match: { ...match, actualDeliveryDate: { $exists: true }, createdAt: { $gte: startDate } } },
      { $project: { hrs: { $divide: [{ $subtract: ['$actualDeliveryDate', '$createdAt'] }, 3600000] } } },
      { $group: { _id: null, avg: { $avg: '$hrs' } } },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Analytics retrieved.', {
    ordersByStatus, ordersByDate, invoiceStats, dispatchStats,
    avgFulfillmentTime: fulfillmentTime[0]?.avg || 0,
  });
};
