const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const { deleteFile } = require('../config/cloudinary');
const { resolveCategoryFromRow, escRx } = require('../utils/resolveCategoryFromRow');
const { logAction } = require('../services/auditLog.service');

async function applyImageSubdoc(brand, field, incoming) {
  if (incoming === undefined) return;
  if (!incoming || !incoming.url) {
    if (brand[field]?.publicId) await deleteFile(brand[field].publicId).catch(() => {});
    brand[field] = { url: null, publicId: null };
  } else {
    if (brand[field]?.publicId && brand[field].publicId !== incoming.publicId) {
      await deleteFile(brand[field].publicId).catch(() => {});
    }
    brand[field] = { url: incoming.url, publicId: incoming.publicId || null };
  }
}

const getAll = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    category,
    page = 1,
    limit = 50,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
  } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (category && mongoose.Types.ObjectId.isValid(category)) filter.category = category;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [brands, total] = await Promise.all([
    Brand.find(filter)
      .populate('category', 'name slug image')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Brand.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Brands retrieved.', brands, {
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
});

const getBySlug = asyncHandler(async (req, res) => {
  const brand = await Brand.findOne({ slug: req.params.slug }).populate('category', 'name slug image');
  if (!brand) throw new AppError('Brand not found.', 404);
  return ApiResponse.success(res, 200, 'Brand retrieved.', brand);
});

const create = asyncHandler(async (req, res) => {
  const { name, description, sortOrder, status, category, logo, banner } = req.body;

  if (!mongoose.Types.ObjectId.isValid(category)) {
    throw new AppError('Invalid category.', 400);
  }
  const cat = await Category.findById(category);
  if (!cat) throw new AppError('Category not found.', 404);

  const doc = {
    name,
    description,
    sortOrder,
    status,
    category,
    createdBy: req.user._id,
  };
  if (logo?.url) doc.logo = { url: logo.url, publicId: logo.publicId || null };
  if (banner?.url) doc.banner = { url: banner.url, publicId: banner.publicId || null };

  const brand = await Brand.create(doc);
  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'Brand',
    targetId: brand._id.toString(),
    description: `Created brand: ${brand.name}`,
    ipAddress: req.ip,
    newData: { name: brand.name, category: String(category) },
  });
  return ApiResponse.created(res, 'Brand created.', brand);
});

const update = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found.', 404);

  ['name', 'description', 'sortOrder', 'status'].forEach((f) => {
    if (req.body[f] !== undefined) brand[f] = req.body[f];
  });

  if (req.body.category !== undefined) {
    if (req.body.category === null || req.body.category === '') {
      brand.category = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        throw new AppError('Invalid category.', 400);
      }
      const cat = await Category.findById(req.body.category);
      if (!cat) throw new AppError('Category not found.', 404);
      brand.category = req.body.category;
    }
  }

  await applyImageSubdoc(brand, 'logo', req.body.logo);
  await applyImageSubdoc(brand, 'banner', req.body.banner);

  await brand.save();
  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Brand',
    targetId: brand._id.toString(),
    description: `Updated brand: ${brand.name}`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Brand updated.', brand);
});

const updateLogo = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found.', 404);
  if (!req.body.imageUrl) throw new AppError('imageUrl is required.', 400);
  if (brand.logo?.publicId) await deleteFile(brand.logo.publicId).catch(() => {});
  brand.logo = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  await brand.save();
  return ApiResponse.success(res, 200, 'Brand logo updated.', brand);
});

const updateBanner = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found.', 404);
  if (!req.body.imageUrl) throw new AppError('imageUrl is required.', 400);
  if (brand.banner?.publicId) await deleteFile(brand.banner.publicId).catch(() => {});
  brand.banner = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  await brand.save();
  return ApiResponse.success(res, 200, 'Brand banner updated.', brand);
});

const toggle = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found.', 404);
  brand.status = brand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await brand.save();
  return ApiResponse.success(res, 200, `Brand ${brand.status.toLowerCase()}.`, brand);
});

const remove = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found.', 404);
  if (brand.logo?.publicId) await deleteFile(brand.logo.publicId).catch(() => {});
  if (brand.banner?.publicId) await deleteFile(brand.banner.publicId).catch(() => {});
  brand.isDeleted = true;
  await brand.save({ validateBeforeSave: false });
  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'Brand',
    targetId: brand._id.toString(),
    description: `Deleted brand: ${brand.name}`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'Brand deleted.');
});

const BULK_MAX_ROWS = 200;

function bulkBrandRowError(e) {
  if (e instanceof AppError) return e.message;
  if (e?.code === 11000) return 'Duplicate brand name.';
  return e?.message || String(e);
}

const bulkImport = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) throw new AppError('rows must be an array.', 400);
  if (!rows.length) throw new AppError('rows cannot be empty.', 400);
  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(`Too many rows (max ${BULK_MAX_ROWS}).`, 400);
  }

  const batchId = new mongoose.Types.ObjectId().toString();
  const errors = [];
  let ok = 0;
  const stats = { categoriesCreated: 0 };
  const autoCreateCategories = req.body.autoCreateCategories !== false;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const nameNorm = String(r.name || '').trim();
      if (!nameNorm) throw new AppError('name is required.', 400);
      const categoryId = await resolveCategoryFromRow(r, {
        autoCreate: autoCreateCategories,
        userId: req.user._id,
        stats,
      });
      const description = r.description != null ? String(r.description).trim() : null;
      const sortOrder =
        r.sortOrder !== undefined && r.sortOrder !== '' && Number.isFinite(Number(r.sortOrder))
          ? Number(r.sortOrder)
          : 0;
      const status = ['ACTIVE', 'INACTIVE'].includes(String(r.status || 'ACTIVE').toUpperCase())
        ? String(r.status || 'ACTIVE').toUpperCase()
        : 'ACTIVE';

      const existing = await Brand.findOne({
        name: new RegExp(`^${escRx(nameNorm)}$`, 'i'),
      });
      if (existing) {
        existing.category = categoryId;
        existing.description = description || null;
        existing.sortOrder = sortOrder;
        existing.status = status;
        await existing.save();
        ok += 1;
      } else {
        await Brand.create({
          name: nameNorm,
          description: description || null,
          sortOrder,
          status,
          category: categoryId,
          createdBy: req.user._id,
        });
        ok += 1;
      }
    } catch (e) {
      errors.push({ row: i + 1, message: bulkBrandRowError(e) });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'Brand',
    targetId: batchId,
    description: `Bulk brand import: ${ok} succeeded, ${errors.length} failed (${rows.length} rows)${
      stats.categoriesCreated ? `; ${stats.categoriesCreated} categories auto-created` : ''
    }`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Bulk import completed.', {
    batchId,
    total: rows.length,
    succeeded: ok,
    failed: errors.length,
    errors,
    categoriesCreated: stats.categoriesCreated || 0,
    autoCreateCategories,
  });
});

module.exports = { getAll, getBySlug, create, update, updateLogo, updateBanner, toggle, remove, bulkImport };
