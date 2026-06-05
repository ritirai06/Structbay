const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { uploadImage, uploadDocument, handleUploadError } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS } = require('../config/constants');

/**
 * Upload Routes — /api/v1/upload
 * Multer memory buffer → Cloudinary v2 stream pipeline.
 * Business logic to be implemented in Phase 2.
 */

// Admin — banner
router.post(
  '/banner',
  protect, requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.BANNER).single('image'),
  handleUploadError,
  (req, res) => res.status(501).json({ success: false, message: 'Not implemented yet.' })
);

// Admin — blog image
router.post(
  '/blog',
  protect, requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.BLOG).single('image'),
  handleUploadError,
  (req, res) => res.status(501).json({ success: false, message: 'Not implemented yet.' })
);

// Customer — BOQ / drawing / PDF
router.post(
  '/customer/document',
  protect, requireRole('CUSTOMER'),
  ...uploadDocument(UPLOAD_FOLDERS.CUSTOMER_DOCS).single('document'),
  handleUploadError,
  (req, res) => res.status(501).json({ success: false, message: 'Not implemented yet.' })
);

// Vendor — certificate / portfolio
router.post(
  '/vendor/document',
  protect, requireRole('VENDOR'),
  ...uploadDocument(UPLOAD_FOLDERS.VENDOR_DOCS).single('document'),
  handleUploadError,
  (req, res) => res.status(501).json({ success: false, message: 'Not implemented yet.' })
);

// All authenticated — profile image
router.post(
  '/profile',
  protect,
  ...uploadImage(UPLOAD_FOLDERS.PROFILE).single('image'),
  handleUploadError,
  (req, res) => res.status(501).json({ success: false, message: 'Not implemented yet.' })
);

module.exports = router;
