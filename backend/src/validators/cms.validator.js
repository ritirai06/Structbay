const { body, param } = require('express-validator');

// ─── Banner ───────────────────────────────────────────────────────────────────
const bannerCreateValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  body('displayOrder').optional().isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
];

// ─── Service ──────────────────────────────────────────────────────────────────
const serviceCreateValidator = [
  body('name').notEmpty().withMessage('Service name is required').trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
];

// ─── Testimonial ──────────────────────────────────────────────────────────────
const testimonialCreateValidator = [
  body('customerName').notEmpty().withMessage('Customer name is required').trim(),
  body('review').notEmpty().withMessage('Review is required').trim(),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
];

// ─── Blog ─────────────────────────────────────────────────────────────────────
const blogCreateValidator = [
  body('title').notEmpty().withMessage('Blog title is required').trim(),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).withMessage('Invalid status'),
];

// ─── Announcement ─────────────────────────────────────────────────────────────
const announcementCreateValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
];

// ─── Advertisement ────────────────────────────────────────────────────────────
const adCreateValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('imageUrl').notEmpty().withMessage('imageUrl is required'),
  body('placement').notEmpty().isIn(['HOME_TOP', 'HOME_MID', 'HOME_BOTTOM', 'SIDEBAR', 'CATEGORY_PAGE', 'SEARCH_PAGE'])
    .withMessage('Invalid placement'),
];

// ─── SEO ──────────────────────────────────────────────────────────────────────
const seoValidator = [
  body('page').notEmpty().withMessage('page identifier is required').trim().toLowerCase(),
];

// ─── Category ─────────────────────────────────────────────────────────────────
const categoryCreateValidator = [
  body('name').notEmpty().withMessage('Category name is required').trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('sortOrder must be a non-negative integer'),
];

module.exports = {
  bannerCreateValidator,
  serviceCreateValidator,
  testimonialCreateValidator,
  blogCreateValidator,
  announcementCreateValidator,
  adCreateValidator,
  seoValidator,
  categoryCreateValidator,
};
