const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Inventory = require('../models/Inventory');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const City = require('../models/City');
const { logAction } = require('../services/auditLog.service');
const { reviveSoftDeleted } = require('../utils/softDeleteRelease');

const OID_RE = /^[a-f0-9]{24}$/i;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Core inventory change used by single adjust and bulk import.
 * @param {object} opts
 * @param {boolean} [opts.auditLog=true] — set false for bulk rows (one summary log is written separately).
 */
async function executeAdjustment({
  userId,
  ip,
  product,
  variation,
  city,
  type,
  quantity,
  reason,
  referenceId,
  lowStockThreshold,
  auditLog = true,
}) {
  if (!product || !city || !type || quantity === undefined) {
    throw new AppError('product, city, type and quantity are required.', 400);
  }
  if (!['ADD', 'DEDUCT', 'ADJUST'].includes(type)) throw new AppError('Invalid type.', 400);

  const q = Number(quantity);
  if (!Number.isFinite(q) || q < 0) throw new AppError('Invalid quantity.', 400);
  if (type !== 'ADJUST' && q <= 0) throw new AppError('quantity must be > 0 for ADD/DEDUCT.', 400);

  const query = { product, city };
  if (variation) query.variation = variation;
  else query.variation = null;

  let inv = await Inventory.findOne(query);
  if (!inv) {
    inv = await reviveSoftDeleted(Inventory, query);
  }
  if (!inv) {
    inv = await Inventory.create({
      product,
      variation: variation || null,
      city,
      quantity: 0,
      updatedBy: userId,
    });
  }

  const before = inv.quantity;
  if (type === 'ADD') inv.quantity += q;
  else if (type === 'DEDUCT') inv.quantity = Math.max(0, inv.quantity - q);
  else inv.quantity = q;
  if (lowStockThreshold !== undefined && Number.isFinite(Number(lowStockThreshold))) {
    inv.lowStockThreshold = Number(lowStockThreshold);
  }
  inv.updatedBy = userId;
  await inv.save();

  await InventoryLog.create({
    inventory: inv._id,
    product,
    city,
    type,
    quantity: q,
    quantityBefore: before,
    quantityAfter: inv.quantity,
    reason,
    referenceId,
    performedBy: userId,
  });

  if (auditLog) {
    await logAction({
      adminId: userId,
      action: 'UPDATE',
      module: 'Inventory',
      targetId: inv._id.toString(),
      description: `${type} ${q} units. Before: ${before}, After: ${inv.quantity}`,
      ipAddress: ip,
      oldData: { quantity: before },
      newData: { quantity: inv.quantity },
    });
  }

  return Inventory.findById(inv._id)
    .populate('product', 'name sku')
    .populate('city', 'name state');
}

async function resolveProductId(row) {
  const pidRaw = row.productId || row.product_id;
  const pid = pidRaw != null ? String(pidRaw).trim() : '';
  if (pid && OID_RE.test(pid)) {
    const p = await Product.findById(pid).select('_id sku').lean();
    if (!p) throw new AppError(`Unknown product id: ${pid}`, 400);
    return String(p._id);
  }
  const prodField = row.product != null ? String(row.product).trim() : '';
  if (prodField && OID_RE.test(prodField)) {
    const p = await Product.findById(prodField).select('_id sku').lean();
    if (!p) throw new AppError(`Unknown product id: ${prodField}`, 400);
    return String(p._id);
  }
  const skuRaw = row.sku ?? row.SKU ?? row.productSku;
  const sku = skuRaw != null ? String(skuRaw).trim().toUpperCase() : '';
  if (!sku) throw new AppError('Each row needs sku or productId', 400);
  const p = await Product.findOne({ sku }).select('_id').lean();
  if (p) return String(p._id);
  const v = await ProductVariation.findOne({
    sku,
    status: 'ACTIVE',
    isDeleted: { $ne: true },
  }).select('product').lean();
  if (v) return String(v.product);
  throw new AppError(`Unknown SKU: ${sku}`, 400);
}

async function resolveVariationId(row, productId) {
  const vidRaw = row.variation ?? row.variationId ?? row.variation_id;
  const vid = vidRaw != null ? String(vidRaw).trim() : '';
  if (vid && OID_RE.test(vid)) return vid;

  const variantSkuRaw = row.variantSku ?? row.variant_sku ?? row.variationSku;
  const variantSku = variantSkuRaw != null ? String(variantSkuRaw).trim().toUpperCase() : '';
  if (variantSku) {
    const v = await ProductVariation.findOne({
      sku: variantSku,
      product: productId,
      status: 'ACTIVE',
      isDeleted: { $ne: true },
    }).select('_id').lean();
    if (!v) throw new AppError(`Unknown variant SKU: ${variantSku}`, 400);
    return String(v._id);
  }

  const skuRaw = row.sku ?? row.SKU ?? row.productSku;
  const sku = skuRaw != null ? String(skuRaw).trim().toUpperCase() : '';
  if (sku) {
    const v = await ProductVariation.findOne({
      sku,
      product: productId,
      status: 'ACTIVE',
      isDeleted: { $ne: true },
    }).select('_id').lean();
    if (v) return String(v._id);
  }

  return undefined;
}

async function resolveCityId(row) {
  const cidRaw = row.cityId || row.city_id;
  const cid = cidRaw != null ? String(cidRaw).trim() : '';
  if (cid && OID_RE.test(cid)) {
    const c = await City.findById(cid).select('_id').lean();
    if (!c) throw new AppError(`Unknown city id: ${cid}`, 400);
    return String(c._id);
  }
  const nameRaw = row.city ?? row.City ?? row.cityName;
  const name = nameRaw != null ? String(nameRaw).trim() : '';
  if (!name) throw new AppError('Each row needs city or cityId', 400);
  if (OID_RE.test(name)) {
    const c = await City.findById(name).select('_id').lean();
    if (!c) throw new AppError(`Unknown city id: ${name}`, 400);
    return String(c._id);
  }
  const c = await City.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') }).select('_id').lean();
  if (!c) throw new AppError(`Unknown city name: ${name}`, 400);
  return String(c._id);
}

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
  const populated = await executeAdjustment({
    userId: req.user._id,
    ip: req.ip,
    product,
    variation,
    city,
    type,
    quantity,
    reason,
    referenceId,
    lowStockThreshold,
    auditLog: true,
  });
  return ApiResponse.success(res, 200, 'Inventory adjusted.', populated);
});

const BULK_MAX_ROWS = 500;

const bulkImport = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) throw new AppError('rows must be an array.', 400);
  if (rows.length === 0) throw new AppError('rows cannot be empty.', 400);
  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(`Too many rows (max ${BULK_MAX_ROWS}). Split into multiple uploads.`, 400);
  }

  const batchId = new mongoose.Types.ObjectId().toString();
  const errors = [];
  let ok = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const product = await resolveProductId(r);
      const city = await resolveCityId(r);
      const typeRaw = String(r.type || 'ADD').trim().toUpperCase();
      if (!['ADD', 'DEDUCT', 'ADJUST'].includes(typeRaw)) {
        throw new AppError(`Invalid type: ${typeRaw}`, 400);
      }
      const qty = r.quantity !== undefined ? r.quantity : r.qty;
      if (qty === undefined || qty === '') throw new AppError('quantity is required', 400);
      const variation = await resolveVariationId(r, product);
      let lowStockThreshold;
      if (r.lowStockThreshold !== undefined && r.lowStockThreshold !== '') {
        lowStockThreshold = Number(r.lowStockThreshold);
      }
      const reason =
        (r.reason != null && String(r.reason).trim()) ||
        `Bulk import row ${i + 1}`;
      const referenceId = `bulk:${batchId}:${i + 1}`;

      await executeAdjustment({
        userId: req.user._id,
        ip: req.ip,
        product,
        variation,
        city,
        type: typeRaw,
        quantity: Number(qty),
        reason,
        referenceId,
        lowStockThreshold,
        auditLog: false,
      });
      ok += 1;
    } catch (e) {
      const message = e instanceof AppError ? e.message : (e && e.message) || String(e);
      errors.push({ row: i + 1, message });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'Inventory',
    targetId: batchId,
    description: `Bulk inventory import (${rows.length} rows): ${ok} succeeded, ${errors.length} failed`,
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

const BULK_DELETE_MAX = 500;

const bulkDelete = asyncHandler(async (req, res) => {
  const raw = req.body?.ids;
  const ids = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : [];
  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!objectIds.length) throw new AppError('No valid inventory ids provided.', 400);
  if (objectIds.length > BULK_DELETE_MAX) {
    throw new AppError(`Too many ids (max ${BULK_DELETE_MAX}).`, 400);
  }

  const errors = [];
  let ok = 0;

  for (const id of objectIds) {
    try {
      const inv = await Inventory.findById(id).select('reserved product city quantity').lean();
      if (!inv) throw new AppError('Inventory row not found.', 404);
      if (Number(inv.reserved) > 0) {
        throw new AppError(`${inv.reserved} unit(s) reserved for orders — release or fulfill first.`, 400);
      }
      await Inventory.deleteOne({ _id: id });
      ok += 1;
    } catch (e) {
      const message = e instanceof AppError ? e.message : (e && e.message) || String(e);
      errors.push({ id, message });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'Inventory',
    targetId: objectIds.slice(0, 20).join(','),
    description: `Bulk deleted ${ok} inventory row(s)${errors.length ? `; ${errors.length} failed` : ''}`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, `Deleted ${ok} inventory row(s).`, {
    total: objectIds.length,
    succeeded: ok,
    failed: errors.length,
    errors,
  });
});

module.exports = { getAll, adjust, bulkImport, bulkDelete, getLogs, getStats };
