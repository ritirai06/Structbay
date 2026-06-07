const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Blog = require('../models/Blog');
const Announcement = require('../models/Announcement');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const City = require('../models/City');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const BulkEnquiry = require('../models/BulkEnquiry');
const ConcreteRFQ = require('../models/ConcreteRFQ');
const { getLogs } = require('../services/auditLog.service');

const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalCustomers, totalVendors, pendingVendors,
    totalProducts, activeProducts,
    totalBrands, totalCategories, totalCities,
    totalOrders, pendingOrders, pendingDispatch, cancelledOrders,
    lowStock, outOfStock,
    newBulkEnquiries, pendingRFQs,
    activeBanners, publishedBlogs,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({ role: 'CUSTOMER', status: { $nin: ['DELETED'] } }),
    User.countDocuments({ role: 'VENDOR', status: { $nin: ['DELETED'] } }),
    User.countDocuments({ role: 'VENDOR', vendorStatus: 'PENDING_APPROVAL' }),
    Product.countDocuments(),
    Product.countDocuments({ status: 'ACTIVE' }),
    Brand.countDocuments({ status: 'ACTIVE' }),
    Category.countDocuments({ status: 'ACTIVE' }),
    City.countDocuments({ status: 'ACTIVE' }),
    Order.countDocuments(),
    Order.countDocuments({ status: 'PENDING' }),
    Order.countDocuments({ status: { $in: ['CONFIRMED', 'PROCESSING'] } }),
    Order.countDocuments({ status: 'CANCELLED' }),
    Inventory.countDocuments({ $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }] } }),
    Inventory.countDocuments({ quantity: 0 }),
    BulkEnquiry.countDocuments({ status: 'NEW' }),
    ConcreteRFQ.countDocuments({ status: 'PENDING' }),
    Banner.countDocuments({ status: 'ACTIVE' }),
    Blog.countDocuments({ status: 'PUBLISHED' }),
    getLogs({ limit: 10 }),
  ]);

  return ApiResponse.success(res, 200, 'Dashboard data retrieved.', {
    users: { customers: totalCustomers, vendors: totalVendors, pendingVendorApprovals: pendingVendors },
    products: { total: totalProducts, active: activeProducts },
    catalog: { brands: totalBrands, categories: totalCategories, cities: totalCities },
    orders: { total: totalOrders, pending: pendingOrders, pendingDispatch, cancelled: cancelledOrders },
    inventory: { lowStock, outOfStock },
    enquiries: { bulkEnquiries: newBulkEnquiries, rfqs: pendingRFQs },
    cms: { activeBanners, publishedBlogs },
    recentActivity: recentAuditLogs.logs,
  });
});

module.exports = { getDashboard };
