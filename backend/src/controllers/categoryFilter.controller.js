const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const CategoryFilter = require('../models/CategoryFilter');
const { logAction } = require('../services/auditLog.service');

const getByCategory = asyncHandler(async (req, res) => {
  const cf = await CategoryFilter.findOne({ category: req.params.categoryId }).populate('category', 'name slug');
  return ApiResponse.success(res, 200, 'Category filters retrieved.', cf || { category: req.params.categoryId, filters: [] });
});

const upsert = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { filters } = req.body;
  if (!Array.isArray(filters)) throw new AppError('filters must be an array.', 400);

  const cf = await CategoryFilter.findOneAndUpdate(
    { category: categoryId },
    { $set: { filters, updatedBy: req.user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('category', 'name slug');

  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'CategoryFilter',
    targetId: cf._id.toString(), description: `Updated filters for category.`, ipAddress: req.ip });

  return ApiResponse.success(res, 200, 'Category filters saved.', cf);
});

module.exports = { getByCategory, upsert };
