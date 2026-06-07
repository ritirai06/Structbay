const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Brand = require('../models/Brand');
const { deleteFile } = require('../config/cloudinary');
const { logAction } = require('../services/auditLog.service');

const getAll = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 50, sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [brands, total] = await Promise.all([
    Brand.find(filter).sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Brand.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Brands retrieved.', brands, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getBySlug = asyncHandler(async (req, res) => {
  const brand = await Brand.findOne({ slug: req.params.slug });
  if (!brand) throw new AppError('Brand not found.', 404);
  return ApiResponse.success(res, 200, 'Brand retrieved.', brand);
});

const create = asyncHandler(async (req, res) => {
  const { name, description, sortOrder, status } = req.body;
  const brand = await Brand.create({ name, description, sortOrder, status, createdBy: req.user._id });
  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'Brand', targetId: brand._id.toString(),
    description: `Created brand: ${brand.name}`, ipAddress: req.ip, newData: { name: brand.name } });
  return ApiResponse.created(res, 'Brand created.', brand);
});

const update = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found.', 404);
  const allowed = ['name', 'description', 'sortOrder', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) brand[f] = req.body[f]; });
  await brand.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Brand', targetId: brand._id.toString(),
    description: `Updated brand: ${brand.name}`, ipAddress: req.ip });
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
  brand.isDeleted = true;
  await brand.save({ validateBeforeSave: false });
  await logAction({ adminId: req.user._id, action: 'DELETE', module: 'Brand', targetId: brand._id.toString(),
    description: `Deleted brand: ${brand.name}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Brand deleted.');
});

module.exports = { getAll, getBySlug, create, update, updateLogo, updateBanner, toggle, remove };
