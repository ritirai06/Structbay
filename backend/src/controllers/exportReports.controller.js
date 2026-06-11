const asyncHandler      = require('../utils/asyncHandler');
const ApiResponse       = require('../utils/apiResponse');
const AppError          = require('../utils/AppError');
const Order             = require('../models/Order');
const VendorOrder       = require('../models/VendorOrder');
const User              = require('../models/User');
const Inventory         = require('../models/Inventory');
const ReportSchedule    = require('../models/ReportSchedule');
const { buildDateFilter } = require('../services/analytics.service');
const { logAction }     = require('../services/auditLog.service');

// ─── CSV helper ───────────────────────────────────────────────────────────────
const toCSV = (rows, fields) => {
  const header = fields.join(',');
  const lines  = rows.map((r) =>
    fields.map((f) => {
      const val = f.split('.').reduce((o, k) => o?.[k], r);
      const str = val === null || val === undefined ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...lines].join('\n');
};

// ─── POST /export/orders ──────────────────────────────────────────────────────
exports.exportOrders = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, status, format = 'csv' } = req.query;
  const filter = buildDateFilter(dateFrom, dateTo);
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('customer', 'name email phone')
    .populate('city', 'name')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const fields = ['orderNumber', 'status', 'paymentStatus', 'grandTotal', 'gstTotal',
    'customer.name', 'customer.email', 'customer.phone', 'city.name', 'createdAt'];

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    return res.send(toCSV(orders, fields));
  }

  return ApiResponse.success(res, 200, 'Orders export data.', orders);
});

// ─── POST /export/vendor-orders ───────────────────────────────────────────────
exports.exportVendorOrders = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, status, vendorId, format = 'csv' } = req.query;
  const filter = buildDateFilter(dateFrom, dateTo);
  if (status)   filter.status = status;
  if (vendorId) filter.vendor = vendorId;

  const vOrders = await VendorOrder.find(filter)
    .populate('vendor', 'companyName contactPerson phone')
    .populate('masterOrder', 'orderNumber')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const fields = ['orderNumber', 'status', 'invoiceStatus', 'dispatchStatus', 'totalAmount',
    'vendor.companyName', 'vendor.contactPerson', 'masterOrder.orderNumber', 'createdAt'];

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vendor-orders.csv"');
    return res.send(toCSV(vOrders, fields));
  }

  return ApiResponse.success(res, 200, 'Vendor orders export data.', vOrders);
});

// ─── POST /export/customers ───────────────────────────────────────────────────
exports.exportCustomers = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, format = 'csv' } = req.query;
  const filter = { role: 'CUSTOMER', ...buildDateFilter(dateFrom, dateTo) };

  const customers = await User.find(filter)
    .select('name email phone status createdAt lastLogin')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const fields = ['name', 'email', 'phone', 'status', 'createdAt', 'lastLogin'];

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    return res.send(toCSV(customers, fields));
  }

  return ApiResponse.success(res, 200, 'Customers export data.', customers);
});

// ─── POST /export/inventory ───────────────────────────────────────────────────
exports.exportInventory = asyncHandler(async (req, res) => {
  const { cityId, format = 'csv' } = req.query;
  const filter = cityId ? { city: cityId } : {};

  const items = await Inventory.find(filter)
    .populate('product', 'name sku')
    .populate('city', 'name')
    .sort({ quantity: 1 })
    .limit(5000)
    .lean();

  const fields = ['product.name', 'product.sku', 'city.name', 'quantity', 'reserved', 'lowStockThreshold', 'updatedAt'];

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
    return res.send(toCSV(items, fields));
  }

  return ApiResponse.success(res, 200, 'Inventory export data.', items);
});

// ─── POST /export/schedules (create scheduled report) ────────────────────────
exports.createSchedule = asyncHandler(async (req, res) => {
  const { name, reportType, frequency, recipients, filters } = req.body;
  if (!name || !reportType || !frequency || !recipients?.length) {
    throw new AppError('name, reportType, frequency, recipients required.', 400);
  }

  // Calculate nextRunAt based on frequency
  const now = new Date();
  const nextRunMap = {
    daily:     new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0, 0),
    weekly:    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 6, 0, 0),
    monthly:   new Date(now.getFullYear(), now.getMonth() + 1, 1, 6, 0, 0),
    quarterly: new Date(now.getFullYear(), now.getMonth() + 3, 1, 6, 0, 0),
    yearly:    new Date(now.getFullYear() + 1, 0, 1, 6, 0, 0),
  };

  const schedule = await ReportSchedule.create({
    name, reportType, frequency, recipients,
    filters: filters || {},
    nextRunAt: nextRunMap[frequency] || nextRunMap.monthly,
    createdBy: req.user._id,
  });

  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'ReportSchedule',
    targetId: schedule._id.toString(), description: `Scheduled report: ${name} (${frequency})`, ipAddress: req.ip });

  return ApiResponse.created(res, 'Report schedule created.', schedule);
});

// ─── GET /export/schedules ────────────────────────────────────────────────────
exports.getSchedules = asyncHandler(async (req, res) => {
  const schedules = await ReportSchedule.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Report schedules retrieved.', schedules);
});

// ─── PATCH /export/schedules/:id ─────────────────────────────────────────────
exports.updateSchedule = asyncHandler(async (req, res) => {
  const allowed = ['name', 'frequency', 'recipients', 'filters', 'isActive'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const schedule = await ReportSchedule.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!schedule) throw new AppError('Schedule not found.', 404);
  return ApiResponse.success(res, 200, 'Schedule updated.', schedule);
});

// ─── DELETE /export/schedules/:id ────────────────────────────────────────────
exports.deleteSchedule = asyncHandler(async (req, res) => {
  await ReportSchedule.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, 200, 'Schedule deleted.');
});
