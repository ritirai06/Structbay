const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadDocumentFields, handleUploadError, uploadDocument } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS } = require('../config/constants');
const { updateUserStatusValidator, adminCreateVendorValidator, adminUpdateVendorValidator } = require('../validators/auth.validator');
const { rejectVendorValidator } = require('../validators/user.validator');
const adminUserController = require('../controllers/adminUser.controller');
const adminSessionController = require('../controllers/adminSession.controller');
const catalogExportController = require('../controllers/catalogExport.controller');
const catalogJobController = require('../controllers/catalogJob.controller');
const {
  catalogExportValidator,
  catalogHistoryQueryValidator,
} = require('../validators/catalogExport.validator');
const {
  catalogCreateJobValidator,
  catalogJobIdValidator,
  catalogJobsListValidator,
  catalogArchiveValidator,
} = require('../validators/catalogJob.validator');
const { getDashboard } = require('../controllers/dashboard.controller');
const { getLogs } = require('../services/auditLog.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const adminOnly = [protect, requireRole('ADMIN')];

const referenceSearchCtrl = require('../controllers/referenceSearch.controller');
router.get('/reference-search', ...adminOnly, asyncHandler(referenceSearchCtrl.searchReferences));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', ...adminOnly, getDashboard);

// ─── Catalog export (CSV / printable HTML) ────────────────────────────────────
router.post(
  '/catalog/export',
  ...adminOnly,
  catalogExportValidator,
  validate,
  asyncHandler(catalogExportController.exportCatalog)
);
router.get(
  '/catalog/history',
  ...adminOnly,
  catalogHistoryQueryValidator,
  validate,
  asyncHandler(catalogExportController.listCatalogHistory)
);

// ─── Catalog jobs (PDF / Excel / CSV, async + stored files) ───────────────────
router.post(
  '/catalog/jobs',
  ...adminOnly,
  catalogCreateJobValidator,
  validate,
  asyncHandler(catalogJobController.createJob)
);
router.get(
  '/catalog/jobs',
  ...adminOnly,
  catalogJobsListValidator,
  validate,
  asyncHandler(catalogJobController.listJobs)
);
router.get(
  '/catalog/jobs/:id/download',
  ...adminOnly,
  catalogJobIdValidator,
  validate,
  asyncHandler(catalogJobController.downloadJob)
);
router.get(
  '/catalog/jobs/:id',
  ...adminOnly,
  catalogJobIdValidator,
  validate,
  asyncHandler(catalogJobController.getJob)
);
router.delete(
  '/catalog/jobs/:id',
  ...adminOnly,
  catalogJobIdValidator,
  validate,
  asyncHandler(catalogJobController.deleteJob)
);
router.patch(
  '/catalog/jobs/:id/archive',
  ...adminOnly,
  catalogArchiveValidator,
  validate,
  asyncHandler(catalogJobController.setArchived)
);
router.post(
  '/catalog/jobs/:id/regenerate',
  ...adminOnly,
  catalogJobIdValidator,
  validate,
  asyncHandler(catalogJobController.regenerateJob)
);

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
router.post('/vendors',                 ...adminOnly, adminCreateVendorValidator, validate, adminUserController.createVendor);
router.post('/vendors/bulk-delete',     ...adminOnly, adminUserController.bulkDeleteVendors);
router.get('/vendors/:id',              ...adminOnly, adminUserController.getVendorById);
router.put('/vendors/:id',              ...adminOnly, adminUpdateVendorValidator, validate, adminUserController.updateVendor);
router.post('/vendors/:id/documents',   ...adminOnly, uploadDocument(UPLOAD_FOLDERS.VENDOR_DOCS).single('document'), handleUploadError, adminUserController.uploadCancelledCheque);
router.put('/vendors/:id/approve',      ...adminOnly, adminUserController.approveVendor);
router.put('/vendors/:id/reject',       ...adminOnly, rejectVendorValidator, validate, adminUserController.rejectVendor);
router.delete('/vendors/:id',           ...adminOnly, adminUserController.deleteVendor);

// ─── Order Activity Logs ─────────────────────────────────────────────────────
const OrderActivityLog = require('../models/OrderActivityLog');
router.get('/order-activity/:orderId', ...adminOnly, asyncHandler(async (req, res) => {
  const logs = await OrderActivityLog.find({ masterOrder: req.params.orderId })
    .sort({ createdAt: -1 }).limit(200);
  return ApiResponse.success(res, 200, 'Order activity logs retrieved.', logs);
}));

// ─── Vendor Order Assignment (legacy) ────────────────────────────────────────
const adminVendorOrderCtrl = require('../controllers/adminVendorOrderController');
const adminVendorWorkflowCtrl = require('../controllers/adminVendorWorkflow.controller');
const staffNotificationCtrl = require('../controllers/staffNotification.controller');

const sbDocsUpload = uploadDocumentFields(UPLOAD_FOLDERS.INVOICE, [
  { name: 'sbInvoice', maxCount: 1 },
  { name: 'ewayBill', maxCount: 1 },
]);
router.get ('/vendor-orders/analytics',          ...adminOnly, asyncHandler(adminVendorOrderCtrl.getVendorOrderAnalytics));
router.get ('/dispatch/vendor-board',           ...adminOnly, asyncHandler(adminVendorOrderCtrl.getVendorDispatchBoard));
router.get ('/vendor-orders',                    ...adminOnly, asyncHandler(adminVendorOrderCtrl.getAllVendorOrders));
router.post('/vendor-orders/bulk-delete',        ...adminOnly, asyncHandler(adminVendorOrderCtrl.bulkDeleteVendorOrders));
router.post('/vendor-orders',                    ...adminOnly, asyncHandler(adminVendorOrderCtrl.assignOrderToVendor));
router.get ('/vendor-orders/:id',                ...adminOnly, asyncHandler(adminVendorOrderCtrl.getVendorOrderById));
router.put ('/vendor-orders/:id',                ...adminOnly, asyncHandler(adminVendorOrderCtrl.updateVendorOrder));
router.delete('/vendor-orders/:id',              ...adminOnly, asyncHandler(adminVendorOrderCtrl.cancelVendorOrder));
router.post('/vendor-orders/:id/request-invoice',...adminOnly, asyncHandler(adminVendorOrderCtrl.requestInvoice));
router.post('/vendor-orders/:id/request-dispatch',...adminOnly, asyncHandler(adminVendorOrderCtrl.requestDispatch));

router.post('/vendor-orders/:id/workflow/approve-dispatch', ...adminOnly, asyncHandler(adminVendorWorkflowCtrl.approveDispatch));
router.post('/vendor-orders/:id/workflow/request-changes', ...adminOnly, asyncHandler(adminVendorWorkflowCtrl.requestDispatchChanges));
router.post(
  '/vendor-orders/:id/workflow/sb-docs',
  ...adminOnly,
  ...sbDocsUpload,
  handleUploadError,
  asyncHandler(adminVendorWorkflowCtrl.sendStructbayDocs)
);
router.post('/vendor-orders/:id/workflow/confirm-delivery', ...adminOnly, asyncHandler(adminVendorWorkflowCtrl.confirmDelivery));
router.post('/vendor-orders/:id/workflow/mark-sb-dispatched', ...adminOnly, asyncHandler(adminVendorWorkflowCtrl.markStructbayDispatched));
router.post('/vendor-orders/:id/workflow/mark-sb-delivered', ...adminOnly, asyncHandler(adminVendorWorkflowCtrl.markStructbayDelivered));

router.get('/inbox/notifications', ...adminOnly, asyncHandler(staffNotificationCtrl.listMine));
router.put('/inbox/notifications/read-all', ...adminOnly, asyncHandler(staffNotificationCtrl.markAllRead));
router.put('/inbox/notifications/:id/read', ...adminOnly, asyncHandler(staffNotificationCtrl.markRead));

// ─── Session Management ───────────────────────────────────────────────────────
router.get('/sessions',          ...adminOnly, adminSessionController.getAllSessions);
router.get('/sessions/user/:id', ...adminOnly, adminSessionController.getUserSessions);
router.delete('/sessions/:id',   ...adminOnly, adminSessionController.revokeSession);

// ─── Commerce Settings ──────────────────────────────────────────────────────────
const cmsController = require('../controllers/cms.controller');
router.get('/cms/commerce-settings',    ...adminOnly, cmsController.getCommerceSettings);
router.put('/cms/commerce-settings',    ...adminOnly, cmsController.updateCommerceSettings);

module.exports = router;
