const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const Order        = require('../models/Order');
const Product      = require('../models/Product');
const Inventory    = require('../models/Inventory');
const { buildDateFilter } = require('../services/analytics.service');

// ─── Shared: product sales aggregation ────────────────────────────────────────
const productSalesAgg = (matchFilter, sort, limitN) => [
  { $match: { ...matchFilter, status: { $ne: 'CANCELLED' } } },
  { $unwind: '$items' },
  { $group: {
    _id: {
      product: '$items.product',
      variation: { $ifNull: ['$items.variation', null] },
    },
    name:           { $first: '$items.name' },
    sku:            { $first: '$items.sku' },
    variationLabel: { $first: '$items.variationLabel' },
    revenue:        { $sum: '$items.lineTotal' },
    quantity:       { $sum: '$items.quantity' },
    orders:         { $addToSet: '$_id' },
  }},
  { $addFields: {
    orderCount: { $size: '$orders' },
    productId: '$_id.product',
    variationId: '$_id.variation',
  }},
  { $sort: sort },
  { $limit: limitN },
  { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
  { $unwind: { path: '$product', preserveNullAndEmpty: true } },
  { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
  { $unwind: { path: '$category', preserveNullAndEmpty: true } },
  { $lookup: { from: 'brands', localField: 'product.brand', foreignField: '_id', as: 'brand' } },
  { $unwind: { path: '$brand', preserveNullAndEmpty: true } },
];

// ─── GET /reports/products/top-selling ───────────────────────────────────────
exports.topSelling = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const data = await Order.aggregate(
    productSalesAgg(buildDateFilter(dateFrom, dateTo), { revenue: -1 }, Number(limit))
  );
  return ApiResponse.success(res, 200, 'Top selling products.', data);
});

// ─── GET /reports/products/low-selling ───────────────────────────────────────
exports.lowSelling = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const data = await Order.aggregate(
    productSalesAgg(buildDateFilter(dateFrom, dateTo), { revenue: 1 }, Number(limit))
  );
  return ApiResponse.success(res, 200, 'Low selling products.', data);
});

// ─── GET /reports/products/performance ────────────────────────────────────────
exports.performance = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, productId, page = 1, limit = 50 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const pageNum    = Math.max(1, parseInt(page));
  const limitNum   = Math.min(200, parseInt(limit));

  const pipeline = [
    { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    ...(productId ? [{ $match: { 'items.product': require('mongoose').Types.ObjectId(productId) } }] : []),
    { $group: {
      _id: {
        product: '$items.product',
        variation: { $ifNull: ['$items.variation', null] },
      },
      name:           { $first: '$items.name' },
      sku:            { $first: '$items.sku' },
      variationLabel: { $first: '$items.variationLabel' },
      revenue:        { $sum: '$items.lineTotal' },
      quantity:       { $sum: '$items.quantity' },
      orderCount:     { $sum: 1 },
    }},
    { $addFields: {
      productId: '$_id.product',
      variationId: '$_id.variation',
    }},
    { $sort: { revenue: -1 } },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'meta' } },
    { $unwind: { path: '$meta', preserveNullAndEmpty: true } },
  ];

  const data = await Order.aggregate(pipeline);
  return ApiResponse.success(res, 200, 'Product performance.', data);
});

// ─── GET /reports/products/assured-express ───────────────────────────────────
exports.assuredExpressPerformance = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const [assured, express] = await Promise.all([
    Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $match: { 'p.isAssured': true } },
      { $group: { _id: null, revenue: { $sum: '$items.lineTotal' }, quantity: { $sum: '$items.quantity' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $match: { 'p.isExpress': true } },
      { $group: { _id: null, revenue: { $sum: '$items.lineTotal' }, quantity: { $sum: '$items.quantity' }, count: { $sum: 1 } } },
    ]),
  ]);

  return ApiResponse.success(res, 200, 'Structbay Assured & Express performance.', {
    assured:  assured[0]  || { revenue: 0, quantity: 0, count: 0 },
    express:  express[0]  || { revenue: 0, quantity: 0, count: 0 },
  });
});

// ─── GET /reports/products/cancellation ──────────────────────────────────────
exports.cancellation = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, status: 'CANCELLED' } },
    { $unwind: '$items' },
    { $group: {
      _id:      '$items.product',
      name:     { $first: '$items.name' },
      quantity: { $sum: '$items.quantity' },
      revenue:  { $sum: '$items.lineTotal' },
      count:    { $sum: 1 },
    }},
    { $sort: { count: -1 } },
    { $limit: Number(limit) },
  ]);

  return ApiResponse.success(res, 200, 'Product cancellation report.', data);
});

// ─── GET /reports/brands ──────────────────────────────────────────────────────
exports.brandReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
    { $unwind: { path: '$p', preserveNullAndEmpty: true } },
    { $group: {
      _id:      '$p.brand',
      revenue:  { $sum: '$items.lineTotal' },
      quantity: { $sum: '$items.quantity' },
      orders:   { $sum: 1 },
    }},
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brand' } },
    { $unwind: { path: '$brand', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Brand report.', data);
});

// ─── GET /reports/categories ──────────────────────────────────────────────────
exports.categoryReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 20 } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
    { $unwind: { path: '$p', preserveNullAndEmpty: true } },
    { $group: {
      _id:      '$p.category',
      revenue:  { $sum: '$items.lineTotal' },
      quantity: { $sum: '$items.quantity' },
      orders:   { $sum: 1 },
    }},
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'Category report.', data);
});

// ─── GET /reports/cities ──────────────────────────────────────────────────────
exports.cityReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const dateFilter = buildDateFilter(dateFrom, dateTo);

  const data = await Order.aggregate([
    { $match: dateFilter },
    { $group: {
      _id:       '$city',
      revenue:   { $sum: '$grandTotal' },
      orders:    { $sum: 1 },
      cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
      delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'COMPLETED']] }, 1, 0] } },
    }},
    { $addFields: { conversionRate: {
      $cond: ['$orders', { $multiply: [{ $divide: ['$delivered', '$orders'] }, 100] }, 0],
    }}},
    { $sort: { revenue: -1 } },
    { $lookup: { from: 'cities', localField: '_id', foreignField: '_id', as: 'city' } },
    { $unwind: { path: '$city', preserveNullAndEmpty: true } },
  ]);

  return ApiResponse.success(res, 200, 'City report.', data);
});
