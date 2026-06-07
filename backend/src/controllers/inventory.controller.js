const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Inventory = require('../models/Inventory');
const InventoryLog = require('../models/InventoryLog');
const { logAction } = require('../services/auditLog.service');

const getAll = asyncHandler(async (req, res) => {
  const { product, city, lowStock, outOfStock, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (city) filter.city = city;
  if (lowStock === 'true') filter.$expr = { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }] };
  if (outOfStock === 'true') filter.quantity = 0;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [inventory, total] = await Promise.all([
    Inventory.find(filter)
      .populate('product', 'name sku')
      .populate('variation', 'attributes sku')
      .populate('city', 'name state')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Inventory.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Inventory retrieved.', inventory, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const adjust = asyncHandler(async (req, res) => {
  const { product, variation, city, type, quantity, reason, referenceId, lowStockThreshold } = req.body;
  if (!product || !city || !type || quantity === undefined) {
    throw new AppError('product, city, type and quantity are required.', 400);
  }
  if (!['ADD', 'DEDUCT', 'ADJUST'].includes(type)) throw new AppError('Invalid type.', 400);

  const query = { product, city };
  if (variation) query.variation = variation;

  let inv = await Inventory.findOne(query);
  if (!inv) {
    inv = await Inventory.create({ product, variation: variation || null, city, quantity: 0, updatedBy: req.user._id });
  }

  const before = inv.quantity;
  if (type === 'ADD') inv.quantity += Number(quantity);
  else if (type === 'DEDUCT') inv.quantity = Math.max(0, inv.quantity - Number(quantity));
  else inv.quantity = Number(quantity); // ADJUST
  if (lowStockThreshold !== undefined) inv.lowStockThreshold = lowStockThreshold;
  inv.updatedBy = req.user._id;
  await inv.save();

  await InventoryLog.create({
    inventory: inv._id, product, city,
    type, quantity: Number(quantity),
    quantityBefore: before, quantityAfter: inv.quantity,
    reason, referenceId, performedBy: req.user._id,
  });

  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Inventory',
    targetId: inv._id.toString(), description: `${type} ${quantity} units. Before: ${before}, After: ${inv.quantity}`,
    ipAddress: req.ip, oldData: { quantity: before }, newData: { quantity: inv.quantity } });

  const populated = await Inventory.findById(inv._id)
    .populate('product', 'name sku').populate('city', 'name state');
  return ApiResponse.success(res, 200, 'Inventory adjusted.', populated);
});

const getLogs = asyncHandler(async (req, res) => {
  const { product, city, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (city) filter.city = city;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate('product', 'name sku')
      .populate('city', 'name state')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    InventoryLog.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Inventory logs retrieved.', logs, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getStats = asyncHandler(async (req, res) => {
  const [total, lowStock, outOfStock] = await Promise.all([
    Inventory.countDocuments(),
    Inventory.countDocuments({ $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$lowStockThreshold'] }] } }),
    Inventory.countDocuments({ quantity: 0 }),
  ]);
  return ApiResponse.success(res, 200, 'Inventory stats.', { total, lowStock, outOfStock });
});

module.exports = { getAll, adjust, getLogs, getStats };
