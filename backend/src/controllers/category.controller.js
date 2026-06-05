const asyncHandler = require('../utils/asyncHandler');
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

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Category.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Categories retrieved.', categories, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
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
  const { name, description, icon, sortOrder, status } = req.body;
  const category = await Category.create({
    name, description, icon, sortOrder, status,
    createdBy: req.user._id,
  });

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
  const allowed = ['name', 'description', 'icon', 'sortOrder', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) category[f] = req.body[f]; });
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

  // Soft delete
  category.isDeleted = true;
  await category.save({ validateBeforeSave: false });

  if (category.image?.publicId) await deleteFile(category.image.publicId).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'Category',
    targetId: category._id.toString(),
    description: `Deleted category: ${category.name}`,
    ipAddress: req.ip,
    oldData: { name: category.name },
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

module.exports = { getAll, getBySlug, create, update, updateImage, remove, toggle };
