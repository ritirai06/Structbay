const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { uploadImage, uploadDocument, handleUploadError, createUploader } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS, FILE_SIZE_LIMITS, ALLOWED_IMAGE_TYPES } = require('../config/constants');
const uploadCtrl = require('../controllers/upload.controller');

/**
 * Upload Routes — /api/v1/upload
 * Multer memory buffer → Cloudinary v2 stream pipeline.
 */

// Admin — category card / hero image (customer-facing)
router.post(
  '/category-image',
  protect,
  requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.CATEGORY).single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

// Admin — brand logo & banner (customer-facing)
router.post(
  '/brand-logo',
  protect,
  requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.BRAND).single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

router.post(
  '/brand-banner',
  protect,
  requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.BRAND).single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

// Admin — product gallery (customer-facing PDP / listings)
router.post(
  '/product-image',
  protect,
  requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.PRODUCT).single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

// Admin — hero / CMS banner (customer-facing, up to 15 MB)
router.post(
  '/banner',
  protect,
  requireRole('ADMIN'),
  ...createUploader(UPLOAD_FOLDERS.BANNER, ALLOWED_IMAGE_TYPES, FILE_SIZE_LIMITS.BANNER_IMAGE, 'image').single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

// Admin — blog image
router.post(
  '/blog',
  protect, requireRole('ADMIN'),
  ...uploadImage(UPLOAD_FOLDERS.BLOG).single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

// Guest / customer — BOQ / drawing / PDF / Excel for bulk enquiries (no login required)
router.post(
  '/enquiry-document',
  ...uploadDocument(UPLOAD_FOLDERS.BULK_ENQUIRY).single('document'),
  handleUploadError,
  uploadCtrl.documentUploadResult
);

// Customer — BOQ / drawing / PDF (authenticated)
router.post(
  '/customer/document',
  protect, requireRole('CUSTOMER'),
  ...uploadDocument(UPLOAD_FOLDERS.CUSTOMER_DOCS).single('document'),
  handleUploadError,
  uploadCtrl.documentUploadResult
);

// Vendor — certificate / portfolio (generic upload; vendor app also uses POST /vendor/documents)
router.post(
  '/vendor/document',
  protect, requireRole('VENDOR'),
  ...uploadDocument(UPLOAD_FOLDERS.VENDOR_DOCS).single('document'),
  handleUploadError,
  uploadCtrl.documentUploadResult
);

// All authenticated — profile image
router.post(
  '/profile',
  protect,
  ...uploadImage(UPLOAD_FOLDERS.PROFILE).single('image'),
  handleUploadError,
  uploadCtrl.imageUploadResult
);

module.exports = router;
