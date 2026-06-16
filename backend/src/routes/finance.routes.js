const router = require('express').Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/finance.controller');
const { uploadDocument, handleUploadError } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS } = require('../config/constants');

const adminOnly = [protect, requireRole('ADMIN')];

const financeDocsUploader = uploadDocument(UPLOAD_FOLDERS.FINANCE).array('documents', 10);

/** Public application (optional Bearer links logged-in customer). */
router.post('/applications', optionalAuth, ctrl.submitApplication);

/** Admin uploads KYC / supporting files for a lead. */
router.post(
  '/leads/:id/documents',
  ...adminOnly,
  ...financeDocsUploader,
  handleUploadError,
  ctrl.uploadDocuments
);

router.get('/dashboard', ...adminOnly, ctrl.getDashboard);
router.get('/leads/export', ...adminOnly, ctrl.exportLeads);
router.get('/leads', ...adminOnly, ctrl.getLeads);
router.get('/leads/:id', ...adminOnly, ctrl.getLeadById);
router.patch('/leads/:id/status', ...adminOnly, ctrl.updateStatus);
router.patch('/leads/:id/assign', ...adminOnly, ctrl.assignLead);
router.patch('/leads/:id/notes', ...adminOnly, ctrl.addNote);
router.patch('/leads/:id/documents/:docId/verify', ...adminOnly, ctrl.verifyDocument);

module.exports = router;
