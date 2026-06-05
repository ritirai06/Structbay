const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Blog = require('../models/Blog');
const Announcement = require('../models/Announcement');
const Advertisement = require('../models/Advertisement');
const Testimonial = require('../models/Testimonial');
const { getLogs } = require('../services/auditLog.service');

const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCustomers,
    totalVendors,
    pendingVendors,
    activeBanners,
    publishedBlogs,
    activeAnnouncements,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({ status: { $nin: ['DELETED'] } }),
    User.countDocuments({ role: 'CUSTOMER', status: { $nin: ['DELETED'] } }),
    User.countDocuments({ role: 'VENDOR', status: { $nin: ['DELETED'] } }),
    User.countDocuments({ role: 'VENDOR', vendorStatus: 'PENDING' }),
    Banner.countDocuments({ status: 'ACTIVE' }),
    Blog.countDocuments({ status: 'PUBLISHED' }),
    Announcement.countDocuments({ status: 'ACTIVE' }),
    getLogs({ limit: 10 }),
  ]);

  return ApiResponse.success(res, 200, 'Dashboard data retrieved.', {
    users: {
      total: totalUsers,
      customers: totalCustomers,
      vendors: totalVendors,
      pendingVendorApprovals: pendingVendors,
    },
    cms: {
      activeBanners,
      publishedBlogs,
      activeAnnouncements,
    },
    recentActivity: recentAuditLogs.logs,
  });
});

module.exports = { getDashboard };
