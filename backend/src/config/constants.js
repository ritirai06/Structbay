// ─── Roles ─────────────────────────────────────────────────────────────────
const ROLES = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
};

// ─── User Account Status ────────────────────────────────────────────────────
const USER_STATUS = {
  PENDING: 'PENDING',       // Registered, email not verified
  ACTIVE: 'ACTIVE',         // Verified and active
  SUSPENDED: 'SUSPENDED',   // Suspended by admin
  REJECTED: 'REJECTED',     // Rejected (vendor)
  DELETED: 'DELETED',       // Soft deleted
};

// ─── Vendor Specific Status ──────────────────────────────────────────────────
const VENDOR_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
};

// ─── Upload Folders (Cloudinary) ─────────────────────────────────────────────
const UPLOAD_FOLDERS = {
  BANNER: 'structbay/banners',
  BLOG: 'structbay/blogs',
  ADVERTISEMENT: 'structbay/ads',
  CATEGORY: 'structbay/categories',
  PROFILE: 'structbay/profiles',
  CUSTOMER_DOCS: 'structbay/customer/documents',
  VENDOR_DOCS: 'structbay/vendor/documents',
  VENDOR_PORTFOLIO: 'structbay/vendor/portfolio',
  VENDOR_CERTS: 'structbay/vendor/certificates',
  QUOTATION: 'structbay/quotations',
};

// ─── File Limits ─────────────────────────────────────────────────────────────
const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5 MB
  DOCUMENT: 20 * 1024 * 1024,  // 20 MB
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ─── Pagination Defaults ──────────────────────────────────────────────────────
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  ROLES,
  USER_STATUS,
  VENDOR_STATUS,
  UPLOAD_FOLDERS,
  FILE_SIZE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  PAGINATION,
};
