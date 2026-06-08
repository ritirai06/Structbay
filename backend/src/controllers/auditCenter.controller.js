const asyncHandler       = require('../utils/asyncHandler');
const ApiResponse        = require('../utils/apiResponse');
const AuditLog           = require('../models/AuditLog');
const OrderActivityLog   = require('../models/OrderActivityLog');
const { buildDateFilter } = require('../services/analytics.service');

// ─── GET /audit/logs ──────────────────────────────────────────────────────────
exports.getLogs = asyncHandler(async (req, res) => {
  const {
    adminId, module: mod, action,
    dateFrom, dateTo,
    search,
    page = 1, limit = 50,
  } = req.query;

  const filter = {};
  if (adminId) filter.adminId = adminId;
  if (mod)     filter.module  = mod;
  if (action)  filter.action  = action;

  const dateFilter = buildDateFilter(dateFrom, dateTo);
  Object.assign(filter, dateFilter);

  if (search) filter.description = { $regex: search, $options: 'i' };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Audit logs retrieved.', logs, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /audit/logs/summary ──────────────────────────────────────────────────
exports.summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [byModule, byAction, byUser, total] = await Promise.all([
    AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$adminId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmpty: true } },
      { $project: { count: 1, 'user.name': 1, 'user.email': 1, 'user.role': 1 } },
    ]),
    AuditLog.countDocuments(dateFilter),
  ]);

  return ApiResponse.success(res, 200, 'Audit summary.', { total, byModule, byAction, topUsers: byUser });
});

// ─── GET /audit/logs/recent ───────────────────────────────────────────────────
exports.recent = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('adminId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(50);
  return ApiResponse.success(res, 200, 'Recent audit activity.', logs);
});

// ─── GET /audit/order-activity ────────────────────────────────────────────────
exports.orderActivity = asyncHandler(async (req, res) => {
  const { orderId, action, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (orderId) filter.masterOrder = orderId;
  if (action)  filter.action = action;
  Object.assign(filter, buildDateFilter(dateFrom, dateTo));

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));

  const [logs, total] = await Promise.all([
    OrderActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    OrderActivityLog.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Order activity logs.', logs, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /audit/modules ───────────────────────────────────────────────────────
exports.getModules = asyncHandler(async (req, res) => {
  const modules = await AuditLog.distinct('module');
  const actions = await AuditLog.distinct('action');
  return ApiResponse.success(res, 200, 'Audit modules & actions.', { modules, actions });
});
