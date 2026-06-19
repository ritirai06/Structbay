const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const Order        = require('../models/Order');
const BulkEnquiry  = require('../models/BulkEnquiry');
const ConcreteRFQ  = require('../models/ConcreteRFQ');
const Address      = require('../models/Address');
const Notification = require('../models/Notification');

// GET /customer/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  const terminalStatuses = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'];

  const [
    totalOrders,
    activeOrders,
    completedOrders,
    pendingOrders,
    cancelledOrders,
    bulkEnquiries,
    rfqs,
    savedAddresses,
    invoicesAvailable,
    unreadNotifications,
    spentAgg,
    recentOrders,
    recentEnquiries,
  ] = await Promise.all([
    Order.countDocuments({ customer: customerId }),
    Order.countDocuments({
      customer: customerId,
      status: {
        $in: [
          'PENDING', 'PAID', 'VENDOR_ASSIGNMENT_PENDING', 'PROCESSING',
          'READY_FOR_DISPATCH', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'PARTIALLY_DELIVERED',
        ],
      },
    }),
    Order.countDocuments({ customer: customerId, status: { $in: ['DELIVERED', 'COMPLETED'] } }),
    Order.countDocuments({ customer: customerId, status: { $nin: terminalStatuses } }),
    Order.countDocuments({ customer: customerId, status: 'CANCELLED' }),
    BulkEnquiry.countDocuments({ customer: customerId }),
    ConcreteRFQ.countDocuments({ customer: customerId }),
    Address.countDocuments({ customer: customerId }),
    Order.countDocuments({ customer: customerId, invoiceUrl: { $ne: null } }),
    Notification.countDocuments({ customer: customerId, isRead: false }),
    Order.aggregate([
      { $match: { customer: customerId, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Order.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('city', 'name')
      .select('orderNumber status grandTotal createdAt city paymentStatus'),
    BulkEnquiry.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('enquiryNumber status createdAt'),
  ]);

  const totalSpent = spentAgg[0]?.total || 0;

  return ApiResponse.success(res, 200, 'Dashboard data retrieved.', {
    stats: {
      totalOrders, activeOrders, completedOrders, pendingOrders,
      cancelledOrders, bulkEnquiries, rfqs, savedAddresses,
      invoicesAvailable, unreadNotifications, totalSpent,
    },
    recentOrders,
    recentEnquiries,
  });
});
