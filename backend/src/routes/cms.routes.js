const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const FooterSubscriber = require('../models/FooterSubscriber');
const CMS = require('../models/CMS');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const {
  bannerCreateValidator,
  serviceCreateValidator,
  testimonialCreateValidator,
  blogCreateValidator,
  announcementCreateValidator,
  adCreateValidator,
  seoValidator,
} = require('../validators/cms.validator');
const cms = require('../controllers/cms.controller');
const { logAction } = require('../services/auditLog.service');

const adminOnly = [protect, requireRole('ADMIN')];

// ─── HOMEPAGE ─────────────────────────────────────────────────────────────────
router.get('/homepage', cms.getHomepage);                         // Public
router.put('/homepage', ...adminOnly, cms.updateHomepage);
router.patch('/homepage', ...adminOnly, cms.updateHomepage);

// ─── BANNERS ──────────────────────────────────────────────────────────────────
router.get('/banners',        cms.getBanners);                    // Public
router.post('/banners',       ...adminOnly, bannerCreateValidator, validate, cms.createBanner);
router.patch('/banners/:id',  ...adminOnly, cms.updateBanner);
router.put('/banners/:id',    ...adminOnly, cms.updateBanner);
router.patch('/banners/:id/toggle', ...adminOnly, cms.toggleBanner);
router.delete('/banners/:id', ...adminOnly, cms.deleteBanner);

// ─── SERVICES ─────────────────────────────────────────────────────────────────
router.get('/services',        cms.getServices);                  // Public
router.post('/services',       ...adminOnly, serviceCreateValidator, validate, cms.createService);
router.patch('/services/:id',  ...adminOnly, cms.updateService);
router.put('/services/:id',    ...adminOnly, cms.updateService);
router.delete('/services/:id', ...adminOnly, cms.deleteService);

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
router.get('/testimonials',        cms.getTestimonials);          // Public
router.post('/testimonials',       ...adminOnly, testimonialCreateValidator, validate, cms.createTestimonial);
router.patch('/testimonials/:id',  ...adminOnly, cms.updateTestimonial);
router.put('/testimonials/:id',    ...adminOnly, cms.updateTestimonial);
router.delete('/testimonials/:id', ...adminOnly, cms.deleteTestimonial);

// ─── BLOGS ────────────────────────────────────────────────────────────────────
router.get('/blogs',           cms.getBlogs);                     // Public (filtered by status)
router.get('/blogs/:slug',     cms.getBlogBySlug);                // Public
router.post('/blogs',          ...adminOnly, blogCreateValidator, validate, cms.createBlog);
router.patch('/blogs/:id',     ...adminOnly, cms.updateBlog);
router.put('/blogs/:id',       ...adminOnly, cms.updateBlog);
router.delete('/blogs/:id',    ...adminOnly, cms.deleteBlog);

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
router.get('/announcements',           cms.getAnnouncements);     // Public
router.post('/announcements',          ...adminOnly, announcementCreateValidator, validate, cms.createAnnouncement);
router.patch('/announcements/:id',     ...adminOnly, cms.updateAnnouncement);
router.put('/announcements/:id',       ...adminOnly, cms.updateAnnouncement);
router.delete('/announcements/:id',    ...adminOnly, cms.deleteAnnouncement);

// ─── ADVERTISEMENTS ───────────────────────────────────────────────────────────
router.get('/ads',           cms.getAds);                         // Public
router.post('/ads',          ...adminOnly, adCreateValidator, validate, cms.createAd);
router.patch('/ads/:id',     ...adminOnly, cms.updateAd);
router.put('/ads/:id',       ...adminOnly, cms.updateAd);
router.delete('/ads/:id',    ...adminOnly, cms.deleteAd);
router.post('/ads/:id/impression', cms.trackImpression);          // Public — called on render
router.post('/ads/:id/click',      cms.trackClick);               // Public — returns redirect link

// ─── SEO ──────────────────────────────────────────────────────────────────────
router.get('/seo',       cms.getSEO);                             // Public
router.post('/seo',      ...adminOnly, seoValidator, validate, cms.upsertSEO);
router.put('/seo',       ...adminOnly, seoValidator, validate, cms.upsertSEO);

// ─── CONTACT ──────────────────────────────────────────────────────────────────
router.get('/contact',       cms.getContact);                     // Public
router.patch('/contact',     ...adminOnly, cms.updateContact);
router.put('/contact',       ...adminOnly, cms.updateContact);

// ─── FOOTER ──────────────────────────────────────────────────────────────────
router.get('/footer', asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  return ApiResponse.success(res, 200, 'Footer retrieved.', cms.footer);
}));

router.patch('/footer', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  const {
    companyDescription, address, phone, email,
    newsletterText, copyrightText, socialLinks,
  } = req.body;
  if (companyDescription !== undefined) doc.footer.companyDescription = companyDescription;
  if (address           !== undefined) doc.footer.address             = address;
  if (phone             !== undefined) doc.footer.phone               = phone;
  if (email             !== undefined) doc.footer.email               = email;
  if (newsletterText    !== undefined) doc.footer.newsletterText      = newsletterText;
  if (copyrightText     !== undefined) doc.footer.copyrightText       = copyrightText;
  if (socialLinks       !== undefined) Object.assign(doc.footer.socialLinks, socialLinks);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Footer',
    description: 'Updated footer', ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Footer updated.', doc.footer);
}));

// Footer Quick Links CRUD
router.post('/footer/quick-links', ...adminOnly, asyncHandler(async (req, res) => {
  const { label, href, sortOrder = 0 } = req.body;
  if (!label || !href) return ApiResponse.badRequest(res, 'label and href are required.');
  const doc = await CMS.getOrCreate();
  doc.footer.quickLinks.push({ label, href, sortOrder });
  doc.footer.quickLinks.sort((a, b) => a.sortOrder - b.sortOrder);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.created(res, 'Quick link added.', doc.footer.quickLinks);
}));

router.patch('/footer/quick-links/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  const link = doc.footer.quickLinks.id(req.params.id);
  if (!link) return ApiResponse.notFound(res, 'Quick link not found.');
  const { label, href, sortOrder } = req.body;
  if (label     !== undefined) link.label     = label;
  if (href      !== undefined) link.href      = href;
  if (sortOrder !== undefined) link.sortOrder = sortOrder;
  doc.footer.quickLinks.sort((a, b) => a.sortOrder - b.sortOrder);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.success(res, 200, 'Quick link updated.', doc.footer.quickLinks);
}));

router.delete('/footer/quick-links/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  doc.footer.quickLinks = doc.footer.quickLinks.filter(l => l._id.toString() !== req.params.id);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.success(res, 200, 'Quick link deleted.', doc.footer.quickLinks);
}));

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
router.post('/newsletter/subscribe', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return ApiResponse.badRequest(res, 'Email is required.');
  const existing = await FooterSubscriber.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (existing.isActive) return ApiResponse.conflict(res, 'You are already subscribed.');
    existing.isActive = true;
    await existing.save();
    return ApiResponse.success(res, 200, 'Welcome back! Re-subscribed.');
  }
  await FooterSubscriber.create({ email });
  return ApiResponse.created(res, 'Subscribed successfully!');
}));

router.get('/newsletter/subscribers', ...adminOnly, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const total = await FooterSubscriber.countDocuments({ isActive: true });
  const subscribers = await FooterSubscriber.find({ isActive: true })
    .sort({ subscribedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('email subscribedAt source');
  return ApiResponse.success(res, 200, 'Subscribers retrieved.', subscribers, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
}));

module.exports = router;
