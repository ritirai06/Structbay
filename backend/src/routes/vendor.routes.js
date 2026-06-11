const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireApprovedVendor } = require('../middleware/role.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { uploadDocument, uploadImage, handleUploadError } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS } = require('../config/constants');

const vendorAuthCtrl      = require('../controllers/vendorAuthController');
const vendorDashCtrl      = require('../controllers/vendorDashboardController');
const vendorOrderCtrl     = require('../controllers/vendorOrderController');
const vendorInvoiceCtrl   = require('../controllers/vendorInvoiceController');
const vendorDispatchCtrl  = require('../controllers/vendorDispatchController');
const vendorProfileCtrl   = require('../controllers/vendorProfileController');
const vendorDocCtrl       = require('../controllers/vendorDocumentController');
const vendorNotifCtrl     = require('../controllers/vendorNotificationController');

// ─── Vendor Auth Middleware ─────────────────────────────────────────────────
// Bridges User-based JWT (protect) with vendor-specific guard
const vendorGuard = [protect, requireApprovedVendor];

// ─── AUTH ───────────────────────────────────────────────────────────────────
router.post('/auth/login',           asyncHandler(vendorAuthCtrl.login));
router.post('/auth/logout',          ...vendorGuard, asyncHandler(vendorAuthCtrl.logout));
router.get ('/auth/me',              ...vendorGuard, asyncHandler(vendorAuthCtrl.getMe));
router.put ('/auth/change-password', ...vendorGuard, asyncHandler(vendorAuthCtrl.changePassword));

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
router.get('/dashboard',            ...vendorGuard, asyncHandler(vendorDashCtrl.getDashboardStats));
router.get('/dashboard/analytics',  ...vendorGuard, asyncHandler(vendorDashCtrl.getAnalytics));

// ─── PROFILE ────────────────────────────────────────────────────────────────
router.get ('/profile',       ...vendorGuard, asyncHandler(vendorProfileCtrl.getProfile));
router.put ('/profile',       ...vendorGuard, asyncHandler(vendorProfileCtrl.updateProfile));
router.post('/profile/image', ...vendorGuard,
  ...uploadImage(UPLOAD_FOLDERS.PROFILE).single('image'),
  handleUploadError,
  asyncHandler(vendorProfileCtrl.uploadProfileImage)
);

// ─── ORDERS ─────────────────────────────────────────────────────────────────
router.get ('/orders/history',  ...vendorGuard, asyncHandler(vendorOrderCtrl.getOrderHistory));
router.post('/orders/search',   ...vendorGuard, asyncHandler(vendorOrderCtrl.searchOrders));
router.get ('/orders',          ...vendorGuard, asyncHandler(vendorOrderCtrl.getAssignedOrders));
router.get ('/orders/:id',      ...vendorGuard, asyncHandler(vendorOrderCtrl.getOrderDetails));
router.put ('/orders/:id/status',...vendorGuard,asyncHandler(vendorOrderCtrl.updateOrderStatus));

// ─── INVOICES ───────────────────────────────────────────────────────────────
const invoiceUploader = uploadDocument(UPLOAD_FOLDERS.INVOICE).single('invoice');
router.get ('/invoices',                ...vendorGuard, asyncHandler(vendorInvoiceCtrl.getAllInvoices));
router.post('/invoices',                ...vendorGuard, invoiceUploader, handleUploadError, asyncHandler(vendorInvoiceCtrl.uploadInvoice));
router.get ('/invoices/order/:orderId', ...vendorGuard, asyncHandler(vendorInvoiceCtrl.getInvoiceByOrder));
router.get ('/invoices/:id/download',   ...vendorGuard, asyncHandler(vendorInvoiceCtrl.downloadInvoice));
router.put ('/invoices/:id/replace',    ...vendorGuard, invoiceUploader, handleUploadError, asyncHandler(vendorInvoiceCtrl.replaceInvoice));

// ─── DISPATCH ───────────────────────────────────────────────────────────────
const dispatchDocUploader = uploadDocument(UPLOAD_FOLDERS.VENDOR_DOCS).single('document');
router.get ('/dispatch',                      ...vendorGuard, asyncHandler(vendorDispatchCtrl.getAllDispatches));
router.post('/dispatch',                      ...vendorGuard, asyncHandler(vendorDispatchCtrl.createDispatch));
router.get ('/dispatch/order/:orderId',       ...vendorGuard, asyncHandler(vendorDispatchCtrl.getDispatchByOrder));
router.put ('/dispatch/:id/status',           ...vendorGuard, asyncHandler(vendorDispatchCtrl.updateDispatchStatus));
router.post('/dispatch/:id/documents',        ...vendorGuard, dispatchDocUploader, handleUploadError, asyncHandler(vendorDispatchCtrl.uploadDispatchDocuments));
router.post('/dispatch/:id/delivery-proof',   ...vendorGuard, dispatchDocUploader, handleUploadError, asyncHandler(vendorDispatchCtrl.uploadDeliveryProof));

// ─── DOCUMENTS ──────────────────────────────────────────────────────────────
const vendorDocUploader = uploadDocument(UPLOAD_FOLDERS.VENDOR_DOCS).single('document');
router.get ('/documents',     ...vendorGuard, asyncHandler(vendorDocCtrl.getDocuments));
router.post('/documents',     ...vendorGuard, vendorDocUploader, handleUploadError, asyncHandler(vendorDocCtrl.uploadDocument));
router.delete('/documents/:id',...vendorGuard, asyncHandler(vendorDocCtrl.deleteDocument));

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
router.get ('/notifications',               ...vendorGuard, asyncHandler(vendorNotifCtrl.getNotifications));
router.put ('/notifications/read-all',      ...vendorGuard, asyncHandler(vendorNotifCtrl.markAllRead));
router.put ('/notifications/:id/read',      ...vendorGuard, asyncHandler(vendorNotifCtrl.markRead));
router.put ('/notifications/:id/archive',   ...vendorGuard, asyncHandler(vendorNotifCtrl.archiveNotification));

// ─── SUPPORT TICKETS ───────────────────────────────────────────────────────
router.post('/support', ...vendorGuard, asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const { subject, priority = 'medium', description } = req.body;
  if (!subject || !description) return ApiResponse.badRequest(res, 'subject and description are required.');
  // Create an admin notification for the support request
  await Notification.create({
    type: 'support_ticket',
    title: `Vendor Support: ${subject}`,
    message: description,
    priority,
    recipients: [],
    metadata: { vendorId: req.user._id, vendorName: req.user.companyName || req.user.name },
  });
  return ApiResponse.created(res, 'Support ticket submitted. Our team will respond within 24-48 hours.');
}));

// ─── ACTIVITY LOGS ──────────────────────────────────────────────────────────
router.get('/activity-logs', ...vendorGuard, asyncHandler(async (req, res) => {
  const VendorActivityLog = require('../models/VendorActivityLog');
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const logs = await VendorActivityLog.find({ vendor: req.user._id })
    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
  const total = await VendorActivityLog.countDocuments({ vendor: req.user._id });
  return ApiResponse.success(res, 200, 'Activity logs retrieved.', logs, {
    page: parseInt(page), limit: parseInt(limit), total,
    pages: Math.ceil(total / parseInt(limit))
  });
}));

module.exports = router;
