const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const CMS = require('../models/CMS');
const Banner = require('../models/Banner');
const Service = require('../models/Service');
const Testimonial = require('../models/Testimonial');
const Blog = require('../models/Blog');
const Announcement = require('../models/Announcement');
const Advertisement = require('../models/Advertisement');
const SEO = require('../models/SEO');
const { deleteFile } = require('../config/cloudinary');
const { logAction } = require('../services/auditLog.service');

// ─── Helper ───────────────────────────────────────────────────────────────────
const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  return { page, limit, skip: (page - 1) * limit };
};

// ═══════════════════════════════════════════════════════════
// HOMEPAGE
// ═══════════════════════════════════════════════════════════
const getHomepage = asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  return ApiResponse.success(res, 200, 'Homepage CMS retrieved.', cms);
});

const updateHomepage = asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  const allowed = [
    'heroTitle', 'heroSubtitle', 'heroCtaText',
    'brandLogoUrl', 'heroBackgroundImageUrl',
    'contact', 'footer', 'featuredCategories',
  ];
  allowed.forEach(f => { if (req.body[f] !== undefined) cms[f] = req.body[f]; });
  cms.lastUpdatedBy = req.user._id;
  await cms.save();

  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Homepage',
    description: 'Updated homepage CMS', ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Homepage updated.', cms);
});

// ═══════════════════════════════════════════════════════════
// BANNERS
// ═══════════════════════════════════════════════════════════
const getBanners = asyncHandler(async (req, res) => {
  const { status, page, limit: lim } = req.query;
  const { page: pageNum, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;

  const [banners, total] = await Promise.all([
    Banner.find(filter).sort({ displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit),
    Banner.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Banners retrieved.', banners, {
    total, page: pageNum, limit, pages: Math.ceil(total / limit),
  });
});

const createBanner = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (req.body.imageUrl) {
    payload.image = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
    delete payload.imageUrl;
    delete payload.imagePublicId;
  }
  const banner = await Banner.create({ ...payload, createdBy: req.user._id });
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Banner',
    targetId: banner._id.toString(), description: `Created banner: ${banner.title}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Banner created.', banner);
});

const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new AppError('Banner not found.', 404);

  const oldData = { title: banner.title, status: banner.status };
  const allowed = ['title', 'subtitle', 'description', 'buttonText', 'buttonLink', 'displayOrder', 'status', 'startDate', 'endDate'];
  allowed.forEach(f => { if (req.body[f] !== undefined) banner[f] = req.body[f]; });

  // Image update
  if (req.body.imageUrl) {
    if (banner.image?.publicId) await deleteFile(banner.image.publicId).catch(() => {});
    banner.image = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  }

  await banner.save();

  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Banner',
    targetId: banner._id.toString(), description: `Updated banner: ${banner.title}`,
    ipAddress: req.ip, oldData, newData: { title: banner.title, status: banner.status },
  });

  return ApiResponse.success(res, 200, 'Banner updated.', banner);
});

const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new AppError('Banner not found.', 404);
  if (banner.image?.publicId) await deleteFile(banner.image.publicId).catch(() => {});

  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Banner',
    targetId: req.params.id, description: `Deleted banner: ${banner.title}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Banner deleted.');
});

const toggleBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new AppError('Banner not found.', 404);
  banner.status = banner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await banner.save();
  return ApiResponse.success(res, 200, `Banner ${banner.status.toLowerCase()}.`, banner);
});

// ═══════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════
const getServices = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const [services, total] = await Promise.all([
    Service.find(filter).populate('category', 'name slug').sort({ displayOrder: 1 }).skip(skip).limit(limit),
    Service.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Services retrieved.', services, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

const createService = asyncHandler(async (req, res) => {
  const service = await Service.create({ ...req.body, createdBy: req.user._id });
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Service',
    targetId: service._id.toString(), description: `Created service: ${service.name}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Service created.', service);
});

const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new AppError('Service not found.', 404);

  const allowed = ['name', 'description', 'icon', 'category', 'displayOrder', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) service[f] = req.body[f]; });
  if (req.body.imageUrl) {
    if (service.image?.publicId) await deleteFile(service.image.publicId).catch(() => {});
    service.image = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  }
  await service.save();

  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Service',
    targetId: service._id.toString(), description: `Updated service: ${service.name}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Service updated.', service);
});

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) throw new AppError('Service not found.', 404);
  if (service.image?.publicId) await deleteFile(service.image.publicId).catch(() => {});
  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Service',
    targetId: req.params.id, description: `Deleted service: ${service.name}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Service deleted.');
});

// ═══════════════════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════════════════
const getTestimonials = asyncHandler(async (req, res) => {
  const { status, featured } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (featured === 'true') filter.isFeatured = true;

  const [items, total] = await Promise.all([
    Testimonial.find(filter).sort({ isFeatured: -1, createdAt: -1 }).skip(skip).limit(limit),
    Testimonial.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Testimonials retrieved.', items, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

const createTestimonial = asyncHandler(async (req, res) => {
  const item = await Testimonial.create({ ...req.body, createdBy: req.user._id });
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Testimonial',
    targetId: item._id.toString(), description: `Created testimonial by ${item.customerName}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Testimonial created.', item);
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const item = await Testimonial.findById(req.params.id);
  if (!item) throw new AppError('Testimonial not found.', 404);

  const allowed = ['customerName', 'designation', 'company', 'review', 'rating', 'isFeatured', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  if (req.body.imageUrl) {
    if (item.image?.publicId) await deleteFile(item.image.publicId).catch(() => {});
    item.image = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  }
  await item.save();
  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Testimonial',
    targetId: item._id.toString(), description: `Updated testimonial by ${item.customerName}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Testimonial updated.', item);
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const item = await Testimonial.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Testimonial not found.', 404);
  if (item.image?.publicId) await deleteFile(item.image.publicId).catch(() => {});
  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Testimonial',
    targetId: req.params.id, description: `Deleted testimonial by ${item.customerName}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Testimonial deleted.');
});

// ═══════════════════════════════════════════════════════════
// BLOGS
// ═══════════════════════════════════════════════════════════
const getBlogs = asyncHandler(async (req, res) => {
  const { status, featured, search, tag } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (featured === 'true') filter.isFeatured = true;
  if (search) filter.$or = [
    { title: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];
  if (tag) filter.tags = tag;

  const [blogs, total] = await Promise.all([
    Blog.find(filter).sort({ publishDate: -1, createdAt: -1 }).skip(skip).limit(limit)
      .select('-content'), // Don't send full content in list view
    Blog.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Blogs retrieved.', blogs, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: 'PUBLISHED' });
  if (!blog) throw new AppError('Blog not found.', 404);
  blog.viewCount += 1;
  await blog.save({ validateBeforeSave: false });
  return ApiResponse.success(res, 200, 'Blog retrieved.', blog);
});

const createBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.create({ ...req.body, createdBy: req.user._id });
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Blog',
    targetId: blog._id.toString(), description: `Created blog: ${blog.title}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Blog created.', blog);
});

const updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) throw new AppError('Blog not found.', 404);

  const oldStatus = blog.status;
  const allowed = ['title', 'description', 'content', 'metaTitle', 'metaDescription', 'author', 'publishDate', 'status', 'isFeatured', 'tags', 'category'];
  allowed.forEach(f => { if (req.body[f] !== undefined) blog[f] = req.body[f]; });
  if (req.body.imageUrl) {
    if (blog.featuredImage?.publicId) await deleteFile(blog.featuredImage.publicId).catch(() => {});
    blog.featuredImage = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  }
  // Preserve slug — only update if explicitly provided
  if (req.body.slug) blog.slug = req.body.slug;

  await blog.save();

  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Blog',
    targetId: blog._id.toString(),
    description: `Updated blog: ${blog.title}${oldStatus !== blog.status ? ` (${oldStatus} → ${blog.status})` : ''}`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Blog updated.', blog);
});

const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) throw new AppError('Blog not found.', 404);
  if (blog.featuredImage?.publicId) await deleteFile(blog.featuredImage.publicId).catch(() => {});
  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Blog',
    targetId: req.params.id, description: `Deleted blog: ${blog.title}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Blog deleted.');
});

// ═══════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════
const getAnnouncements = asyncHandler(async (req, res) => {
  const { status, audience, liveOnly } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (audience) filter.audience = audience;
  if (liveOnly === 'true') {
    const now = new Date();
    filter.status = 'ACTIVE';
    filter.$and = [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ];
  }

  const [items, total] = await Promise.all([
    Announcement.find(filter).sort({ isPinned: -1, priority: -1, createdAt: -1 }).skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Announcements retrieved.', items, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const item = await Announcement.create({ ...req.body, createdBy: req.user._id });
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Announcement',
    targetId: item._id.toString(), description: `Created announcement: ${item.title}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Announcement created.', item);
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const item = await Announcement.findById(req.params.id);
  if (!item) throw new AppError('Announcement not found.', 404);

  const allowed = ['title', 'description', 'priority', 'isPinned', 'startDate', 'endDate', 'status', 'audience'];
  allowed.forEach(f => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  await item.save();
  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Announcement',
    targetId: item._id.toString(), description: `Updated announcement: ${item.title}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Announcement updated.', item);
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const item = await Announcement.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Announcement not found.', 404);
  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Announcement',
    targetId: req.params.id, description: `Deleted announcement: ${item.title}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Announcement deleted.');
});

// ═══════════════════════════════════════════════════════════
// ADVERTISEMENTS
// ═══════════════════════════════════════════════════════════
const getAds = asyncHandler(async (req, res) => {
  const { status, placement } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (placement) filter.placement = placement;

  const [ads, total] = await Promise.all([
    Advertisement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Advertisement.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Advertisements retrieved.', ads, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

const createAd = asyncHandler(async (req, res) => {
  if (!req.body.imageUrl) throw new AppError('imageUrl is required for an advertisement.', 400);
  const ad = await Advertisement.create({
    ...req.body,
    image: { url: req.body.imageUrl, publicId: req.body.imagePublicId || null },
    createdBy: req.user._id,
  });
  await logAction({
    adminId: req.user._id, action: 'CREATE', module: 'Advertisement',
    targetId: ad._id.toString(), description: `Created ad: ${ad.title}`, ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'Advertisement created.', ad);
});

const updateAd = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);
  if (!ad) throw new AppError('Advertisement not found.', 404);

  const allowed = ['title', 'link', 'placement', 'startDate', 'endDate', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) ad[f] = req.body[f]; });
  if (req.body.imageUrl) {
    if (ad.image?.publicId) await deleteFile(ad.image.publicId).catch(() => {});
    ad.image = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  }
  await ad.save();
  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Advertisement',
    targetId: ad._id.toString(), description: `Updated ad: ${ad.title}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Advertisement updated.', ad);
});

const deleteAd = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByIdAndDelete(req.params.id);
  if (!ad) throw new AppError('Advertisement not found.', 404);
  if (ad.image?.publicId) await deleteFile(ad.image.publicId).catch(() => {});
  await logAction({
    adminId: req.user._id, action: 'DELETE', module: 'Advertisement',
    targetId: req.params.id, description: `Deleted ad: ${ad.title}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Advertisement deleted.');
});

// Track impression — public, called on ad render
const trackImpression = asyncHandler(async (req, res) => {
  await Advertisement.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
  return ApiResponse.success(res, 200, 'Impression recorded.');
});

// Track click — public
const trackClick = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });
  if (!ad) throw new AppError('Ad not found.', 404);
  return ApiResponse.success(res, 200, 'Click recorded.', { link: ad.link });
});

// ═══════════════════════════════════════════════════════════
// SEO
// ═══════════════════════════════════════════════════════════
const getSEO = asyncHandler(async (req, res) => {
  const { page } = req.query;
  const filter = page ? { page } : {};
  const seoEntries = await SEO.find(filter).sort({ page: 1 });
  return ApiResponse.success(res, 200, 'SEO settings retrieved.', seoEntries);
});

const upsertSEO = asyncHandler(async (req, res) => {
  const { page: pageName, ...rest } = req.body;
  if (!pageName) throw new AppError('page identifier is required.', 400);

  const seo = await SEO.findOneAndUpdate(
    { page: pageName },
    { ...rest, updatedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );

  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'SEO',
    targetId: pageName, description: `Updated SEO for page: ${pageName}`, ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'SEO settings saved.', seo);
});

// ═══════════════════════════════════════════════════════════
// CONTACT INFO (stored in CMS singleton)
// ═══════════════════════════════════════════════════════════
const getContact = asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  return ApiResponse.success(res, 200, 'Contact info retrieved.', cms.contact);
});

const updateContact = asyncHandler(async (req, res) => {
  const cms = await CMS.getOrCreate();
  const allowed = ['phone', 'email', 'address', 'whatsapp', 'supportEmail', 'mapLink', 'workingHours'];
  allowed.forEach(f => { if (req.body[f] !== undefined) cms.contact[f] = req.body[f]; });
  cms.lastUpdatedBy = req.user._id;
  await cms.save();
  await logAction({
    adminId: req.user._id, action: 'UPDATE', module: 'Contact',
    description: 'Updated contact info', ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Contact info updated.', cms.contact);
});

module.exports = {
  getHomepage, updateHomepage,
  getBanners, createBanner, updateBanner, deleteBanner, toggleBanner,
  getServices, createService, updateService, deleteService,
  getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
  getBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAds, createAd, updateAd, deleteAd, trackImpression, trackClick,
  getSEO, upsertSEO,
  getContact, updateContact,
};
