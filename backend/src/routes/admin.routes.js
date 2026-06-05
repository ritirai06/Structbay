const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateUserStatusValidator } = require('../validators/auth.validator');
const { rejectVendorValidator } = require('../validators/user.validator');
const adminUserController = require('../controllers/adminUser.controller');
const adminSessionController = require('../controllers/adminSession.controller');
const { getDashboard } = require('../controllers/dashboard.controller');
const { getLogs } = require('../services/auditLog.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const adminOnly = [protect, requireRole('ADMIN')];

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', ...adminOnly, getDashboard);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', ...adminOnly, asyncHandler(async (req, res) => {
  const result = await getLogs(req.query);
  return ApiResponse.success(res, 200, 'Audit logs retrieved.', result.logs, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  });
}));

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users',            ...adminOnly, adminUserController.getAllUsers);
router.get('/users/:id',        ...adminOnly, adminUserController.getUserById);
router.put('/users/:id/status', ...adminOnly, updateUserStatusValidator, validate, adminUserController.updateUserStatus);
router.delete('/users/:id',     ...adminOnly, adminUserController.deleteUser);

// ─── Vendor Management ────────────────────────────────────────────────────────
router.get('/vendors',                  ...adminOnly, adminUserController.getAllVendors);
router.put('/vendors/:id/approve',      ...adminOnly, adminUserController.approveVendor);
router.put('/vendors/:id/reject',       ...adminOnly, rejectVendorValidator, validate, adminUserController.rejectVendor);

// ─── Session Management ───────────────────────────────────────────────────────
router.get('/sessions',          ...adminOnly, adminSessionController.getAllSessions);
router.get('/sessions/user/:id', ...adminOnly, adminSessionController.getUserSessions);
router.delete('/sessions/:id',   ...adminOnly, adminSessionController.revokeSession);

module.exports = router;
