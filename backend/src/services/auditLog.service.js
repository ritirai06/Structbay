const AuditLog = require('../models/AuditLog');

/**
 * Log an admin action.
 * @param {object} opts
 * @param {string} opts.adminId
 * @param {string} opts.action  - CREATE | UPDATE | DELETE | APPROVE | REJECT | PUBLISH | TOGGLE
 * @param {string} opts.module  - Banner | Category | Blog | Vendor | etc.
 * @param {string} [opts.targetId]
 * @param {string} [opts.description]
 * @param {string} [opts.ipAddress]
 * @param {any}    [opts.oldData]
 * @param {any}    [opts.newData]
 */
const logAction = async (opts) => {
  try {
    await AuditLog.create(opts);
  } catch {
    // Audit logging must never break the main request
  }
};

/**
 * Get paginated audit logs with optional filters.
 */
const getLogs = async ({ page = 1, limit = 20, adminId, module: mod, action, startDate, endDate } = {}) => {
  const filter = {};
  if (adminId) filter.adminId = adminId;
  if (mod) filter.module = mod;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
};

module.exports = { logAction, getLogs };
