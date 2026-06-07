const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const City = require('../models/City');
const { logAction } = require('../services/auditLog.service');

const getAll = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));
  const [cities, total] = await Promise.all([
    City.find(filter).sort({ sortOrder: 1, name: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    City.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Cities retrieved.', cities, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  return ApiResponse.success(res, 200, 'City retrieved.', city);
});

const create = asyncHandler(async (req, res) => {
  const { name, state, status, isServiceable, priority, sortOrder } = req.body;
  const city = await City.create({ name, state, status, isServiceable, priority, sortOrder, createdBy: req.user._id });
  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'City', targetId: city._id.toString(),
    description: `Created city: ${city.name}`, ipAddress: req.ip });
  return ApiResponse.created(res, 'City created.', city);
});

const update = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  const allowed = ['name', 'state', 'status', 'isServiceable', 'priority', 'sortOrder'];
  allowed.forEach(f => { if (req.body[f] !== undefined) city[f] = req.body[f]; });
  await city.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'City', targetId: city._id.toString(),
    description: `Updated city: ${city.name}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'City updated.', city);
});

const toggle = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  city.status = city.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await city.save();
  return ApiResponse.success(res, 200, `City ${city.status.toLowerCase()}.`, city);
});

const remove = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  city.isDeleted = true;
  await city.save({ validateBeforeSave: false });
  await logAction({ adminId: req.user._id, action: 'DELETE', module: 'City', targetId: city._id.toString(),
    description: `Deleted city: ${city.name}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'City deleted.');
});

module.exports = { getAll, getById, create, update, toggle, remove };
