const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const GeneratedCatalog = require('../models/GeneratedCatalog');
const catalogRender = require('../services/catalogRender.service');
const catalogJob = require('../services/catalogJob.service');
const { logAction } = require('../services/auditLog.service');

function payloadFromBody(body) {
  return {
    productId: body.productId || undefined,
    productIds: Array.isArray(body.productIds) ? body.productIds : undefined,
    categoryId: body.categoryId || undefined,
    brandId: body.brandId || undefined,
    vendorUserId: body.vendorUserId || undefined,
  };
}

function scopeLabelFromRequest(body) {
  const { scopeType } = body;
  if (scopeType === 'ALL') return 'All active products';
  if (scopeType === 'SELECTED') return `Selected (${(body.productIds || []).length} products)`;
  if (scopeType === 'CATEGORY') return `Category catalog`;
  if (scopeType === 'BRAND') return `Brand catalog`;
  if (scopeType === 'PRODUCT') return 'Single product';
  if (scopeType === 'VENDOR') return 'Vendor assortment';
  return scopeType;
}

exports.createJob = asyncHandler(async (req, res) => {
  const {
    scopeType,
    format = 'pdf',
    catalogName,
    filters = {},
    options = {},
  } = req.body;

  const payloadSummary = payloadFromBody(req.body);
  const name =
    (catalogName && String(catalogName).trim()) ||
    catalogJob.defaultCatalogName(scopeType, payloadSummary);

  const doc = await GeneratedCatalog.create({
    createdBy: req.user._id,
    generatedByName: req.user.name || req.user.email || 'Admin',
    catalogName: name,
    scopeType,
    scopeLabel: scopeLabelFromRequest(req.body),
    format: String(format).toLowerCase(),
    status: 'QUEUED',
    filters,
    options,
    payloadSummary,
    version: 1,
    archived: false,
  });

  catalogJob.enqueueCatalogJob(doc._id);

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'CatalogJob',
    description: `Queued ${doc.format.toUpperCase()} catalog (${scopeType})`,
    ipAddress: req.ip,
    newData: { jobId: String(doc._id), scopeType, format: doc.format },
  });

  return ApiResponse.created(res, 'Catalog generation queued.', {
    id: String(doc._id),
    status: doc.status,
  });
});

exports.getJob = asyncHandler(async (req, res) => {
  const row = await GeneratedCatalog.findById(req.params.id).populate('createdBy', 'name email').lean();
  if (!row) return ApiResponse.notFound(res, 'Catalog job not found.');
  return ApiResponse.success(res, 200, 'Catalog job.', row);
});

exports.listJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const includeArchived = req.query.includeArchived === 'true';

  const filter = {};
  if (!includeArchived) filter.archived = { $ne: true };

  const [rows, total] = await Promise.all([
    GeneratedCatalog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    GeneratedCatalog.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Catalog jobs.', rows, {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  });
});

exports.downloadJob = asyncHandler(async (req, res) => {
  const job = await GeneratedCatalog.findById(req.params.id);
  if (!job) return ApiResponse.notFound(res, 'Catalog job not found.');
  if (job.status !== 'COMPLETED' || !job.storedFileName) {
    return ApiResponse.error(res, 400, 'Catalog file is not ready yet.');
  }
  const fp = path.join(catalogJob.UPLOAD_DIR, job.storedFileName);
  if (!fs.existsSync(fp)) return ApiResponse.notFound(res, 'Catalog file missing on server.');

  const safeBase = (job.catalogName || 'structbay-catalog').replace(/[^\w\s\-().]/g, '').trim() || 'structbay-catalog';
  const ext = catalogRender.extensionForFormat(job.format);
  res.setHeader('Content-Type', catalogRender.mimeForFormat(job.format));
  res.setHeader('Content-Disposition', `attachment; filename="${safeBase}.${ext}"`);
  return res.sendFile(path.resolve(fp));
});

exports.deleteJob = asyncHandler(async (req, res) => {
  const job = await GeneratedCatalog.findById(req.params.id);
  if (!job) return ApiResponse.notFound(res, 'Catalog job not found.');
  await catalogJob.deleteStoredFile(job);
  await GeneratedCatalog.deleteOne({ _id: job._id });

  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'CatalogJob',
    description: `Deleted catalog job ${job._id}`,
    ipAddress: req.ip,
    oldData: { scopeType: job.scopeType, format: job.format },
  });

  return ApiResponse.success(res, 200, 'Catalog job deleted.', { id: String(req.params.id) });
});

exports.setArchived = asyncHandler(async (req, res) => {
  const job = await GeneratedCatalog.findById(req.params.id);
  if (!job) return ApiResponse.notFound(res, 'Catalog job not found.');
  job.archived = !!req.body.archived;
  await job.save();
  return ApiResponse.success(res, 200, 'Catalog job updated.', job);
});

exports.regenerateJob = asyncHandler(async (req, res) => {
  const old = await GeneratedCatalog.findById(req.params.id);
  if (!old) return ApiResponse.notFound(res, 'Catalog job not found.');

  const doc = await GeneratedCatalog.create({
    createdBy: req.user._id,
    generatedByName: req.user.name || req.user.email || 'Admin',
    catalogName: old.catalogName,
    scopeType: old.scopeType,
    scopeLabel: old.scopeLabel,
    format: old.format,
    status: 'QUEUED',
    filters: old.filters || {},
    options: old.options || {},
    payloadSummary: old.payloadSummary || {},
    version: (old.version || 1) + 1,
    archived: false,
  });

  catalogJob.enqueueCatalogJob(doc._id);

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'CatalogJob',
    description: `Regenerated catalog from job ${old._id}`,
    ipAddress: req.ip,
    newData: { jobId: String(doc._id), parentId: String(old._id) },
  });

  return ApiResponse.created(res, 'Catalog regeneration queued.', {
    id: String(doc._id),
    status: doc.status,
  });
});
