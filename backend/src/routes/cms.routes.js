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
const { ensureCmsDefaults, policyForResponse, landingPageForResponse, DEFAULT_FOOTER_QUICK_LINKS } = require('../services/cmsDefaults.service');

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
router.post('/contact/message', cms.submitContactMessage);       // Public — homepage form
router.patch('/contact',     ...adminOnly, cms.updateContact);
router.put('/contact',       ...adminOnly, cms.updateContact);

// ─── FOOTER ──────────────────────────────────────────────────────────────────
router.get('/footer', asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  const footer = cms.footer?.toObject?.() ?? { ...cms.footer };
  if (!Array.isArray(footer.quickLinks) || footer.quickLinks.length === 0) {
    footer.quickLinks = DEFAULT_FOOTER_QUICK_LINKS;
  }
  return ApiResponse.success(res, 200, 'Footer retrieved.', footer);
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

// ─── POLICIES (footer legal pages) ───────────────────────────────────────────
router.get('/policies', asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  const list = (cms.policies || [])
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((p) => policyForResponse(p));
  return ApiResponse.success(res, 200, 'Policies retrieved.', list);
}));

router.get('/policies/all', ...adminOnly, asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  const list = [...(cms.policies || [])]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((p) => policyForResponse(p));
  return ApiResponse.success(res, 200, 'Policies retrieved.', list);
}));

router.get('/policies/:slug', asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  const slug = String(req.params.slug || '').trim().toLowerCase();
  const policy = (cms.policies || []).find((p) => String(p.slug).toLowerCase() === slug);
  if (!policy || policy.isActive === false) {
    return ApiResponse.notFound(res, 'Policy not found.');
  }
  return ApiResponse.success(res, 200, 'Policy retrieved.', policyForResponse(policy));
}));

router.post('/policies', ...adminOnly, asyncHandler(async (req, res) => {
  const { slug, title, subtitle, lastUpdated, sections, isActive = true, sortOrder = 0 } = req.body;
  if (!slug || !title) return ApiResponse.badRequest(res, 'slug and title are required.');
  const doc = await CMS.getOrCreate();
  const normalized = String(slug).trim().toLowerCase();
  if ((doc.policies || []).some((p) => String(p.slug).toLowerCase() === normalized)) {
    return ApiResponse.badRequest(res, 'A policy with this slug already exists.');
  }
  doc.policies.push({
    slug: normalized,
    title: String(title).trim(),
    subtitle: subtitle != null ? String(subtitle).trim() : '',
    lastUpdated: lastUpdated != null ? String(lastUpdated).trim() : '',
    sections: Array.isArray(sections) ? sections : [],
    isActive: isActive !== false,
    sortOrder: Number(sortOrder) || 0,
  });
  doc.policies.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Policy',
    description: `Created policy ${normalized}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Policy created.', doc.policies);
}));

router.patch('/policies/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  const policy = doc.policies.id(req.params.id);
  if (!policy) return ApiResponse.notFound(res, 'Policy not found.');
  const { slug, title, subtitle, lastUpdated, sections, isActive, sortOrder } = req.body;
  if (slug !== undefined) {
    const normalized = String(slug).trim().toLowerCase();
    const clash = doc.policies.some(
      (p) => p._id.toString() !== policy._id.toString() && String(p.slug).toLowerCase() === normalized
    );
    if (clash) return ApiResponse.badRequest(res, 'Another policy already uses this slug.');
    policy.slug = normalized;
  }
  if (title !== undefined) policy.title = String(title).trim();
  if (subtitle !== undefined) policy.subtitle = String(subtitle).trim();
  if (lastUpdated !== undefined) policy.lastUpdated = String(lastUpdated).trim();
  if (sections !== undefined) policy.sections = Array.isArray(sections) ? sections : [];
  if (isActive !== undefined) policy.isActive = !!isActive;
  if (sortOrder !== undefined) policy.sortOrder = Number(sortOrder) || 0;
  doc.policies.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Policy',
    description: `Updated policy ${policy.slug}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Policy updated.', policyForResponse(policy));
}));

router.delete('/policies/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  const policy = doc.policies.id(req.params.id);
  if (!policy) return ApiResponse.notFound(res, 'Policy not found.');
  const slug = policy.slug;
  doc.policies = doc.policies.filter((p) => p._id.toString() !== req.params.id);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Policy',
    description: `Deleted policy ${slug}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Policy deleted.', doc.policies);
}));

// ─── LANDING PAGES ───────────────────────────────────────────────────────────
router.get('/landing-pages', asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  await ensureCmsDefaults(doc);
  const list = (doc.landingPages || [])
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(landingPageForResponse);
  return ApiResponse.success(res, 200, 'Landing pages retrieved.', list);
}));

router.get('/landing-pages/all', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  await ensureCmsDefaults(doc);
  const list = [...(doc.landingPages || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return ApiResponse.success(res, 200, 'All landing pages.', list);
}));

router.get('/landing-pages/:slug', asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  await ensureCmsDefaults(doc);
  const slug = String(req.params.slug || '').toLowerCase();
  const page = (doc.landingPages || []).find((p) => String(p.slug).toLowerCase() === slug && p.isActive !== false);
  if (!page) return ApiResponse.notFound(res, 'Landing page not found.');
  return ApiResponse.success(res, 200, 'Landing page retrieved.', landingPageForResponse(page));
}));

router.post('/landing-pages', ...adminOnly, asyncHandler(async (req, res) => {
  const { slug, title, subtitle, pageType, calculatorType, sections, isActive, sortOrder } = req.body;
  if (!slug || !title) return ApiResponse.badRequest(res, 'slug and title are required.');
  const doc = await CMS.getOrCreate();
  const normalized = String(slug).trim().toLowerCase();
  if ((doc.landingPages || []).some((p) => String(p.slug).toLowerCase() === normalized)) {
    return ApiResponse.badRequest(res, 'A landing page with this slug already exists.');
  }
  doc.landingPages.push({
    slug: normalized,
    title: String(title).trim(),
    subtitle: subtitle || '',
    pageType: 'content',
    calculatorType: 'none',
    sections: Array.isArray(sections) ? sections : [],
    isActive: isActive !== false,
    sortOrder: Number(sortOrder) || 0,
  });
  doc.landingPages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.created(res, 'Landing page created.', doc.landingPages);
}));

router.patch('/landing-pages/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  const page = doc.landingPages.id(req.params.id);
  if (!page) return ApiResponse.notFound(res, 'Landing page not found.');
  if (req.body.slug !== undefined) {
    const normalized = String(req.body.slug).trim().toLowerCase();
    const clash = doc.landingPages.some(
      (p) => p._id.toString() !== req.params.id && String(p.slug).toLowerCase() === normalized
    );
    if (clash) return ApiResponse.badRequest(res, 'Slug already in use.');
    page.slug = normalized;
  }
  ['title', 'subtitle', 'pageType', 'calculatorType', 'sections', 'isActive', 'sortOrder'].forEach((f) => {
    if (req.body[f] !== undefined) page[f] = req.body[f];
  });
  doc.landingPages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.success(res, 200, 'Landing page updated.', landingPageForResponse(page));
}));

router.delete('/landing-pages/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  doc.landingPages = (doc.landingPages || []).filter((p) => p._id.toString() !== req.params.id);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.success(res, 200, 'Landing page deleted.', doc.landingPages);
}));

// ─── VENDOR FAQS ─────────────────────────────────────────────────────────────
router.get('/vendor-faqs', asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  return ApiResponse.success(res, 200, 'Vendor FAQs retrieved.', doc.vendorFaqs.filter(f => f.isActive));
}));

router.post('/vendor-faqs', ...adminOnly, asyncHandler(async (req, res) => {
  const { question, answer, sortOrder = 0 } = req.body;
  if (!question || !answer) return ApiResponse.badRequest(res, 'question and answer are required.');
  const doc = await CMS.getOrCreate();
  doc.vendorFaqs.push({ question, answer, sortOrder });
  doc.vendorFaqs.sort((a, b) => a.sortOrder - b.sortOrder);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.created(res, 'Vendor FAQ added.', doc.vendorFaqs);
}));

router.patch('/vendor-faqs/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  const faq = doc.vendorFaqs.id(req.params.id);
  if (!faq) return ApiResponse.notFound(res, 'FAQ not found.');
  ['question', 'answer', 'sortOrder', 'isActive'].forEach(f => { if (req.body[f] !== undefined) faq[f] = req.body[f]; });
  doc.vendorFaqs.sort((a, b) => a.sortOrder - b.sortOrder);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.success(res, 200, 'Vendor FAQ updated.', doc.vendorFaqs);
}));

router.delete('/vendor-faqs/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const doc = await CMS.getOrCreate();
  doc.vendorFaqs = doc.vendorFaqs.filter(f => f._id.toString() !== req.params.id);
  doc.lastUpdatedBy = req.user._id;
  await doc.save();
  return ApiResponse.success(res, 200, 'Vendor FAQ deleted.', doc.vendorFaqs);
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
