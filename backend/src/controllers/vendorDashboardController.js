const mongoose = require('mongoose');
const VendorOrder = require('../models/VendorOrder');
const VendorNotification = require('../models/VendorNotification');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get Vendor Dashboard Stats
// @route   GET /api/v1/vendor/dashboard
exports.getDashboardStats = async (req, res) => {
  const vendorId = req.user._id;

  const [
    totalOrders, pendingOrders, readyForDispatch,
    inTransit, delivered, pendingInvoices,
    unreadNotifications, recentOrders, recentActivities, monthlyStats,
  ] = await Promise.all([
    VendorOrder.countDocuments({ vendor: vendorId }),
    VendorOrder.countDocuments({ vendor: vendorId, status: { $in: ['new_order_alert', 'ready_for_dispatch'] } }),
    VendorOrder.countDocuments({ vendor: vendorId, status: 'ready_for_dispatch' }),
    VendorOrder.countDocuments({ vendor: vendorId, status: { $in: ['dispatched', 'in_transit', 'pickup_scheduled'] } }),
    VendorOrder.countDocuments({ vendor: vendorId, status: { $in: ['material_delivered', 'delivery_confirmed', 'completed'] } }),
    VendorOrder.countDocuments({ vendor: vendorId, invoiceStatus: 'pending' }),
    VendorNotification.countDocuments({ vendor: vendorId, isRead: false }),
    VendorOrder.find({ vendor: vendorId })
      .sort({ createdAt: -1 }).limit(10)
      .populate('assignedProducts.product', 'name')
      .select('orderNumber status createdAt totalAmount deliveryAddress assignedProducts priority'),
    VendorActivityLog.find({ vendor: vendorId }).sort({ createdAt: -1 }).limit(10).select('action description createdAt'),
    VendorOrder.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $in: ['$status', ['material_delivered', 'delivery_confirmed', 'completed']] }, 1, 0] } },
        totalAmount: { $sum: '$totalAmount' },
      }},
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Dashboard stats retrieved.', {
    orderStats: { total: totalOrders, pending: pendingOrders, readyForDispatch, inTransit, delivered, pendingInvoices },
    monthlyFulfillment: monthlyStats[0] || { totalOrders: 0, completedOrders: 0, totalAmount: 0 },
    recentOrders,
    recentActivities,
    unreadNotifications,
  });
};

// @desc    Get Performance Analytics
// @route   GET /api/v1/vendor/dashboard/analytics
exports.getAnalytics = async (req, res) => {
  const vendorId = req.user._id;
  const { period = '30' } = req.query;
  const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

  const [ordersByStatus, ordersByDate, invoiceStats, dispatchStats, fulfillmentTime] = await Promise.all([
    VendorOrder.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    VendorOrder.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$invoiceStatus', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$dispatchStatus', count: { $sum: 1 } } },
    ]),
    VendorOrder.aggregate([
      { $match: { vendor: vendorId, actualDeliveryDate: { $exists: true }, createdAt: { $gte: startDate } } },
      { $project: { hrs: { $divide: [{ $subtract: ['$actualDeliveryDate', '$createdAt'] }, 3600000] } } },
      { $group: { _id: null, avg: { $avg: '$hrs' } } },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Analytics retrieved.', {
    ordersByStatus, ordersByDate, invoiceStats, dispatchStats,
    avgFulfillmentTime: fulfillmentTime[0]?.avg || 0,
  });
};
