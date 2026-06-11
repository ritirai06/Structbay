const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const CityPricing = require('../models/CityPricing');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const City = require('../models/City');
const { logAction } = require('../services/auditLog.service');

const OID_RE = /^[a-f0-9]{24}$/i;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveProductOidFromRow(r) {
  const pidRaw = r.productId || r.product_id;
  const pid = pidRaw != null ? String(pidRaw).trim() : '';
  if (pid && OID_RE.test(pid)) {
    const p = await Product.findById(pid).select('_id').lean();
    if (!p) throw new AppError(`Unknown product id: ${pid}`, 400);
    return p._id;
  }
  const prodField = r.product != null ? String(r.product).trim() : '';
  if (prodField && OID_RE.test(prodField)) {
    const p = await Product.findById(prodField).select('_id').lean();
    if (!p) throw new AppError(`Unknown product id: ${prodField}`, 400);
    return p._id;
  }
  const skuRaw = r.sku ?? r.SKU ?? r.productSku;
  const sku = skuRaw != null ? String(skuRaw).trim().toUpperCase() : '';
  if (!sku) throw new AppError('sku or productId is required.', 400);
  const p = await Product.findOne({ sku }).select('_id').lean();
  if (!p) throw new AppError(`Unknown SKU: ${sku}`, 400);
  return p._id;
}

async function resolveCityOidFromRow(r) {
  const cid = String(r.cityId || r.city_id || '').trim();
  if (cid && OID_RE.test(cid)) {
    const c = await City.findById(cid).select('_id').lean();
    if (!c) throw new AppError(`Unknown city id: ${cid}`, 400);
    return c._id;
  }
  const slug = String(r.citySlug || r.city_slug || '').trim().toLowerCase();
  if (slug) {
    const c = await City.findOne({ slug }).select('_id').lean();
    if (!c) throw new AppError(`Unknown city slug: ${slug}`, 400);
    return c._id;
  }
  const name = String(r.cityName || r.city_name || r.city || '').trim();
  if (name && OID_RE.test(name)) {
    const c = await City.findById(name).select('_id').lean();
    if (!c) throw new AppError(`Unknown city id: ${name}`, 400);
    return c._id;
  }
  if (name) {
    const c = await City.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') }).select('_id').lean();
    if (!c) throw new AppError(`Unknown city name: ${name}`, 400);
    return c._id;
  }
  throw new AppError('cityId, citySlug, or city / cityName is required.', 400);
}

async function resolveVariationOidFromRow(productOid, r) {
  const vid = String(r.variationId || r.variation_id || '').trim();
  if (vid && OID_RE.test(vid)) {
    const v = await ProductVariation.findById(vid).select('product').lean();
    if (!v) throw new AppError(`Unknown variation id: ${vid}`, 400);
    if (String(v.product) !== String(productOid)) throw new AppError('Variation does not belong to product.', 400);
    return v._id;
  }
  const vSku = String(r.variationSku || r.variation_sku || '').trim().toUpperCase();
  if (!vSku) return null;
  const v = await ProductVariation.findOne({ sku: vSku }).select('product').lean();
  if (!v) throw new AppError(`Unknown variation SKU: ${vSku}`, 400);
  if (String(v.product) !== String(productOid)) throw new AppError('Variation SKU does not match this product.', 400);
  return v._id;
}

function parseCompactWholesaleSlabs(s) {
  const parts = s.split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 5) throw new AppError('At most 5 wholesale slabs.', 400);
  const out = [];
  for (const seg of parts) {
    const bits = seg.split(':').map((x) => x.trim());
    if (bits.length === 2) {
      const minQty = Number(bits[0]);
      const price = Number(bits[1]);
      if (!Number.isFinite(minQty) || minQty < 0) throw new AppError(`Invalid slab minQty in "${seg}".`, 400);
      if (!Number.isFinite(price) || price < 0) throw new AppError(`Invalid slab price in "${seg}".`, 400);
      out.push({ minQty, maxQty: null, price });
    } else if (bits.length === 3) {
      const minQty = Number(bits[0]);
      const maxQty = Number(bits[1]);
      const price = Number(bits[2]);
      if (!Number.isFinite(minQty) || minQty < 0) throw new AppError(`Invalid slab minQty in "${seg}".`, 400);
      if (!Number.isFinite(maxQty) || maxQty < minQty) throw new AppError(`Invalid slab maxQty in "${seg}".`, 400);
      if (!Number.isFinite(price) || price < 0) throw new AppError(`Invalid slab price in "${seg}".`, 400);
      out.push({ minQty, maxQty, price });
    } else {
      throw new AppError(
        `Invalid wholesaleSlabs segment "${seg}". Use min:price tiers (50:400|100:395), or min:max:price, or a JSON array.`,
        400
      );
    }
  }
  for (let i = 0; i < out.length; i += 1) {
    if (out[i].maxQty === null && i < out.length - 1) {
      const nextMin = out[i + 1].minQty;
      out[i].maxQty = nextMin > out[i].minQty ? nextMin - 1 : out[i].minQty;
    }
  }
  return out;
}

function parseJsonWholesaleSlabs(s) {
  let arr;
  try {
    arr = JSON.parse(s);
  } catch {
    throw new AppError('wholesaleSlabs must be valid JSON array.', 400);
  }
  if (!Array.isArray(arr)) throw new AppError('wholesaleSlabs must be a JSON array.', 400);
  if (arr.length > 5) throw new AppError('At most 5 wholesale slabs.', 400);
  return arr.map((sl, i) => {
    const minQty = Number(sl.minQty);
    const price = Number(sl.price);
    const maxQty = sl.maxQty === null || sl.maxQty === '' || sl.maxQty === undefined ? null : Number(sl.maxQty);
    if (!Number.isFinite(minQty) || minQty < 0) throw new AppError(`Invalid slab ${i + 1} minQty.`, 400);
    if (!Number.isFinite(price) || price < 0) throw new AppError(`Invalid slab ${i + 1} price.`, 400);
    if (maxQty != null && (!Number.isFinite(maxQty) || maxQty < minQty)) throw new AppError(`Invalid slab ${i + 1} maxQty.`, 400);
    return { minQty, maxQty, price };
  });
}

function parseWholesaleSlabsFromRow(r) {
  const raw = r.wholesaleSlabs ?? r.wholesale_slabs;
  if (raw == null || String(raw).trim() === '') return [];
  const s = String(raw).trim();
  if (s.startsWith('[') || s.startsWith('{')) {
    return parseJsonWholesaleSlabs(s);
  }
  return parseCompactWholesaleSlabs(s);
}

function boolFromRow(v, def = true) {
  if (v === undefined || v === null || v === '') return def;
  return !['false', '0', 'no', 'n'].includes(String(v).toLowerCase().trim());
}

function bulkPricingRowError(e) {
  if (e instanceof AppError) return e.message;
  return e?.message || String(e);
}

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
  else query.variation = null;

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

const BULK_MAX_ROWS = 500;

const bulkImport = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) throw new AppError('rows must be an array.', 400);
  if (!rows.length) throw new AppError('rows cannot be empty.', 400);
  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(`Too many rows (max ${BULK_MAX_ROWS}).`, 400);
  }

  const batchId = new mongoose.Types.ObjectId().toString();
  const errors = [];
  let ok = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const productOid = await resolveProductOidFromRow(r);
      const cityOid = await resolveCityOidFromRow(r);
      const variationOid = await resolveVariationOidFromRow(productOid, r);

      const reg = Number(r.regularPrice ?? r.regular_price);
      if (!Number.isFinite(reg) || reg < 0) throw new AppError('regularPrice must be a non-negative number.', 400);

      const $set = {
        regularPrice: reg,
        updatedBy: req.user._id,
      };

      if (r.salePrice !== undefined || r.sale_price !== undefined) {
        const saleRaw = r.salePrice ?? r.sale_price;
        if (saleRaw === null || saleRaw === '' || String(saleRaw).trim() === '') {
          $set.salePrice = null;
        } else {
          const sp = Number(saleRaw);
          if (!Number.isFinite(sp) || sp < 0) throw new AppError('salePrice must be a non-negative number or empty.', 400);
          $set.salePrice = sp;
        }
      }

      if (r.isVisible !== undefined || r.is_visible !== undefined) {
        $set.isVisible = boolFromRow(r.isVisible ?? r.is_visible, true);
      }

      if (r.wholesaleSlabs !== undefined || r.wholesale_slabs !== undefined || r.slabs !== undefined) {
        $set.wholesaleSlabs = parseWholesaleSlabsFromRow(r);
      }

      const query = variationOid
        ? { product: productOid, city: cityOid, variation: variationOid }
        : { product: productOid, city: cityOid, variation: null };

      await CityPricing.findOneAndUpdate(
        query,
        { $set },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      ok += 1;
    } catch (e) {
      errors.push({ row: i + 1, message: bulkPricingRowError(e) });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'CityPricing',
    targetId: batchId,
    description: `Bulk city pricing import: ${ok} succeeded, ${errors.length} failed (${rows.length} rows)`,
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

module.exports = { getAll, upsert, remove, bulkImport };
