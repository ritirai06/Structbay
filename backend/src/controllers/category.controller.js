const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../lib/apiShape');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Category = require('../models/Category');
const { deleteFile } = require('../config/cloudinary');
const { logAction } = require('../services/auditLog.service');

// ─── GET /api/v1/categories ───────────────────────────────────────────────────
const getAll = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 50, sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const [categories, total, activeTotal] = await Promise.all([
    Category.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Category.countDocuments(filter),
    Category.countDocuments({ ...filter, status: 'ACTIVE' }),
  ]);

  return ApiResponse.success(res, 200, 'Categories retrieved.', categories, {
    total, active: activeTotal, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /api/v1/categories/:slug ─────────────────────────────────────────────
const getBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, status: 'ACTIVE' });
  if (!category) throw new AppError('Category not found.', 404);
  return ApiResponse.success(res, 200, 'Category retrieved.', category);
});

// ─── POST /api/v1/categories ──────────────────────────────────────────────────
const create = asyncHandler(async (req, res) => {
  const { name, description, listingHeadline, icon, sortOrder, status, image } = req.body;
  const payload = {
    name,
    description,
    listingHeadline,
    icon,
    sortOrder,
    status,
    createdBy: req.user._id,
  };
  if (image && image.url) {
    payload.image = { url: image.url, publicId: image.publicId || null };
  }

  const category = await Category.create(payload);

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'Category',
    targetId: category._id.toString(),
    description: `Created category: ${category.name}`,
    ipAddress: req.ip,
    newData: { name: category.name, slug: category.slug },
  });

  return ApiResponse.created(res, 'Category created.', category);
});

// ─── PATCH /api/v1/categories/:id ─────────────────────────────────────────────
const update = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found.', 404);

  const oldData = { name: category.name, status: category.status };
  const allowed = ['name', 'description', 'listingHeadline', 'icon', 'sortOrder', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) category[f] = req.body[f]; });

  if (req.body.image !== undefined) {
    const img = req.body.image;
    if (!img || !img.url) {
      if (category.image?.publicId) await deleteFile(category.image.publicId).catch(() => {});
      category.image = { url: null, publicId: null };
    } else {
      if (category.image?.publicId && category.image.publicId !== img.publicId) {
        await deleteFile(category.image.publicId).catch(() => {});
      }
      category.image = { url: img.url, publicId: img.publicId || null };
    }
  }

  await category.save();

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Category',
    targetId: category._id.toString(),
    description: `Updated category: ${category.name}`,
    ipAddress: req.ip,
    oldData,
    newData: { name: category.name, status: category.status },
  });

  return ApiResponse.success(res, 200, 'Category updated.', category);
});

// ─── PATCH /api/v1/categories/:id/image ───────────────────────────────────────
const updateImage = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found.', 404);
  if (!req.body.imageUrl) throw new AppError('imageUrl is required.', 400);

  if (category.image?.publicId) await deleteFile(category.image.publicId);
  category.image = { url: req.body.imageUrl, publicId: req.body.imagePublicId || null };
  await category.save();

  return ApiResponse.success(res, 200, 'Category image updated.', category);
});

// ─── DELETE /api/v1/categories/:id ────────────────────────────────────────────
const remove = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found.', 404);

  const oldName = category.name;
  if (category.image?.publicId) await deleteFile(category.image.publicId).catch(() => {});
  await category.deleteOne();

  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'Category',
    targetId: category._id.toString(),
    description: `Deleted category: ${oldName}`,
    ipAddress: req.ip,
    oldData: { name: oldName },
  });

  return ApiResponse.success(res, 200, 'Category deleted.');
});

// ─── PATCH /api/v1/categories/:id/toggle ──────────────────────────────────────
const toggle = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found.', 404);
  category.status = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await category.save();
  return ApiResponse.success(res, 200, `Category ${category.status.toLowerCase()}.`, category);
});

const BULK_MAX_ROWS = 200;

function bulkRowError(e) {
  if (e instanceof AppError) return e.message;
  if (e?.code === 11000) return 'Duplicate name or slug.';
  return e?.message || String(e);
}

const bulkImport = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) throw new AppError('rows must be an array.', 400);
  if (!rows.length) throw new AppError('rows cannot be empty.', 400);
  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(`Too many rows (max ${BULK_MAX_ROWS}). Split into multiple uploads.`, 400);
  }

  const batchId = generateObjectIdString();
  const errors = [];
  let ok = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const name = String(r.name || '').trim();
      if (!name) throw new AppError('name is required.', 400);
      const description = r.description != null ? String(r.description).trim() : null;
      const icon = r.icon != null ? String(r.icon).trim() : null;
      const sortOrder =
        r.sortOrder !== undefined && r.sortOrder !== '' && Number.isFinite(Number(r.sortOrder))
          ? Number(r.sortOrder)
          : 0;
      const status = ['ACTIVE', 'INACTIVE'].includes(String(r.status || 'ACTIVE').toUpperCase())
        ? String(r.status || 'ACTIVE').toUpperCase()
        : 'ACTIVE';

      await Category.create({
        name,
        description: description || null,
        icon: icon || null,
        sortOrder,
        status,
        createdBy: req.user._id,
      });
      ok += 1;
    } catch (e) {
      errors.push({ row: i + 1, message: bulkRowError(e) });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'Category',
    targetId: batchId,
    description: `Bulk category import: ${ok} succeeded, ${errors.length} failed (${rows.length} rows)`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Bulk import completed.', {
    batchId,
    total: rows.length,
    succeeded: ok,
    failed: errors.length,
    errors,
  });
});

module.exports = { getAll, getBySlug, create, update, updateImage, remove, toggle, bulkImport };
