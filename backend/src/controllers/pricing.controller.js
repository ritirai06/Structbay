const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const CityPricing = require('../models/CityPricing');
const { logAction } = require('../services/auditLog.service');

const getAll = asyncHandler(async (req, res) => {
  const { product, city, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (city) filter.city = city;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [pricing, total] = await Promise.all([
    CityPricing.find(filter)
      .populate('product', 'name sku')
      .populate('variation', 'attributes sku')
      .populate('city', 'name state')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    CityPricing.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Pricing retrieved.', pricing, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const upsert = asyncHandler(async (req, res) => {
  const { product, variation, city, regularPrice, salePrice, wholesaleSlabs, isVisible } = req.body;
  if (!product || !city || regularPrice === undefined) throw new AppError('product, city, regularPrice are required.', 400);

  const query = { product, city };
  if (variation) query.variation = variation;

  const pricing = await CityPricing.findOneAndUpdate(
    query,
    { $set: { regularPrice, salePrice, wholesaleSlabs, isVisible, updatedBy: req.user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('product', 'name sku').populate('city', 'name state');

  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'CityPricing',
    targetId: pricing._id.toString(), description: `Upserted pricing for product in city.`, ipAddress: req.ip });

  return ApiResponse.success(res, 200, 'Pricing saved.', pricing);
});

const remove = asyncHandler(async (req, res) => {
  const pricing = await CityPricing.findById(req.params.id);
  if (!pricing) throw new AppError('Pricing record not found.', 404);
  pricing.isDeleted = true;
  await pricing.save({ validateBeforeSave: false });
  return ApiResponse.success(res, 200, 'Pricing removed.');
});

module.exports = { getAll, upsert, remove };
