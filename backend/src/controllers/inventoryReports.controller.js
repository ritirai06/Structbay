const asyncHandler   = require('../utils/asyncHandler');
const ApiResponse    = require('../utils/apiResponse');
const Inventory      = require('../models/Inventory');
const InventoryLog   = require('../models/InventoryLog');
const { buildDateFilter } = require('../services/analytics.service');

// ─── GET /reports/inventory/current ──────────────────────────────────────────
exports.currentStock = asyncHandler(async (req, res) => {
  const { cityId, categoryId, brandId, page = 1, limit = 50 } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));

  const pipeline = [
    ...(cityId ? [{ $match: { city: require('mongoose').Types.ObjectId(cityId) } }] : []),
    { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    ...(categoryId ? [{ $match: { 'product.category': require('mongoose').Types.ObjectId(categoryId) } }] : []),
    ...(brandId    ? [{ $match: { 'product.brand':    require('mongoose').Types.ObjectId(brandId)    } }] : []),
    { $lookup: { from: 'cities', localField: 'city', foreignField: '_id', as: 'city' } },
    { $unwind: { path: '$city', preserveNullAndEmpty: true } },
    { $addFields: { available: { $max: [0, { $subtract: ['$quantity', '$reserved'] }] } } },
    { $sort: { quantity: 1 } },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
  ];

  const [data, total] = await Promise.all([
    Inventory.aggregate(pipeline),
    Inventory.countDocuments(cityId ? { city: cityId } : {}),
  ]);

  return ApiResponse.success(res, 200, 'Current stock levels.', data, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /reports/inventory/low-stock ────────────────────────────────────────
exports.lowStock = asyncHandler(async (req, res) => {
  const { cityId } = req.query;
  const match = { $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }] } };
  if (cityId) match.city = require('mongoose').Types.ObjectId(cityId);

  const data = await Inventory.find(match)
    .populate('product', 'name sku category brand')
    .populate('city', 'name state')
    .sort({ quantity: 1 })
    .limit(200);

  return ApiResponse.success(res, 200, 'Low stock products.', data);
});

// ─── GET /reports/inventory/out-of-stock ──────────────────────────────────────
exports.outOfStock = asyncHandler(async (req, res) => {
  const { cityId } = req.query;
  const match = { quantity: 0 };
  if (cityId) match.city = cityId;

  const data = await Inventory.find(match)
    .populate('product', 'name sku category brand')
    .populate('city', 'name state')
    .sort({ updatedAt: -1 })
    .limit(200);

  return ApiResponse.success(res, 200, 'Out of stock products.', data);
});

// ─── GET /reports/inventory/city-wise ────────────────────────────────────────
exports.cityWise = asyncHandler(async (req, res) => {
  const data = await Inventory.aggregate([
    { $group: {
      _id:          '$city',
      totalProducts:{ $sum: 1 },
      totalQuantity:{ $sum: '$quantity' },
      totalReserved:{ $sum: '$reserved' },
      outOfStock:   { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
      lowStock:     { $sum: { $cond: [{
        $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }],
      }, 1, 0] } },
    }},
    { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
    { $unwind: { path: '$city', preserveNullAndEmpty: true } },
    { $sort: { totalQuantity: -1 } },
  ]);
  return ApiResponse.success(res, 200, 'City-wise inventory.', data);
});

// ─── GET /reports/inventory/movement ─────────────────────────────────────────
exports.stockMovement = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, productId, cityId, type, page = 1, limit = 50 } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));

  const filter = buildDateFilter(dateFrom, dateTo);
  if (productId) filter.product = productId;
  if (cityId)    filter.city    = cityId;
  if (type)      filter.type    = type;

  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate('product', 'name sku')
      .populate('city', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    InventoryLog.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Stock movement logs.', logs, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /reports/inventory/summary-stats ─────────────────────────────────────
exports.summaryStats = asyncHandler(async (req, res) => {
  const [stats] = await Inventory.aggregate([
    { $group: {
      _id:            null,
      totalSKUs:      { $sum: 1 },
      totalQuantity:  { $sum: '$quantity' },
      totalReserved:  { $sum: '$reserved' },
      outOfStock:     { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
      lowStock:       { $sum: { $cond: [{
        $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }],
      }, 1, 0] }},
    }},
  ]);
  return ApiResponse.success(res, 200, 'Inventory summary.', stats || {});
});
