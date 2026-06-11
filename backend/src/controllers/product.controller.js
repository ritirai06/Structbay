const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const Brand = require('../models/Brand');
const { deleteFile } = require('../config/cloudinary');
const { logAction } = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');
const { resolveCategoryFromRow, escRx } = require('../utils/resolveCategoryFromRow');

async function resolveBrandForProductRow(r) {
  const byId = String(r.brandId || r.brand_id || '').trim();
  if (byId && mongoose.Types.ObjectId.isValid(byId)) {
    const b = await Brand.findById(byId).select('_id').lean();
    if (!b) throw new AppError('Brand not found.', 404);
    return b._id;
  }
  const name = String(r.brandName || r.brand_name || r.brand || '').trim();
  if (!name) throw new AppError('brandId or brandName is required.', 400);
  if (mongoose.Types.ObjectId.isValid(name)) {
    const b = await Brand.findById(name).select('_id').lean();
    if (!b) throw new AppError('Brand not found.', 404);
    return b._id;
  }
  const b = await Brand.findOne({ name: new RegExp(`^${escRx(name)}$`, 'i') }).select('_id').lean();
  if (!b) throw new AppError(`Brand name not found: ${name}`, 404);
  return b._id;
}

// ─── Products ──────────────────────────────────────────────────────────────

const getAll = asyncHandler(async (req, res) => {
  const { search, status, category, brand, page = 1, limit = 24 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { sku: { $regex: search, $options: 'i' } },
  ];

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Products retrieved.', products, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('brand', 'name slug logo');
  if (!product) throw new AppError('Product not found.', 404);
  const variations = await ProductVariation.find({ product: product._id });
  return ApiResponse.success(res, 200, 'Product retrieved.', { ...product.toJSON(), variations });
});

const getBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, status: 'ACTIVE' })
    .populate('category', 'name slug')
    .populate('brand', 'name slug logo');
  if (!product) throw new AppError('Product not found.', 404);
  const variations = await ProductVariation.find({ product: product._id, status: 'ACTIVE' });
  return ApiResponse.success(res, 200, 'Product retrieved.', { ...product.toJSON(), variations });
});

const create = asyncHandler(async (req, res) => {
  const {
    name, sku, category, brand, shortDescription, description,
    gstPercentage, status, isFeatured, isTopSelling, isAssured, isExpress,
    displayOrder, seo, faqs, videos, documents,
  } = req.body;

  const referenceNumber = await generateRefNumber('PRODUCT');

  const product = await Product.create({
    name, sku, category, brand, shortDescription, description,
    gstPercentage, status, isFeatured, isTopSelling, isAssured, isExpress,
    displayOrder, seo, faqs, videos, documents,
    referenceNumber,
    createdBy: req.user._id,
  });

  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'Product', targetId: product._id.toString(),
    description: `Created product: ${product.name}`, ipAddress: req.ip, newData: { name: product.name, sku: product.sku } });

  return ApiResponse.created(res, 'Product created.', product);
});

const update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  const allowed = [
    'name', 'sku', 'category', 'brand', 'shortDescription', 'description',
    'gstPercentage', 'status', 'isFeatured', 'isTopSelling', 'isAssured', 'isExpress',
    'displayOrder', 'seo', 'faqs', 'videos', 'documents',
  ];
  allowed.forEach(f => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
  await product.save();

  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Product', targetId: product._id.toString(),
    description: `Updated product: ${product.name}`, ipAddress: req.ip });

  return ApiResponse.success(res, 200, 'Product updated.', product);
});

const addImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  if (!req.body.images || !Array.isArray(req.body.images)) throw new AppError('images array is required.', 400);
  product.images.push(...req.body.images);
  await product.save();
  return ApiResponse.success(res, 200, 'Images added.', product);
});

const removeImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  const img = product.images.id(req.params.imageId);
  if (img?.publicId) await deleteFile(img.publicId).catch(() => {});
  product.images = product.images.filter(i => i._id.toString() !== req.params.imageId);
  await product.save();
  return ApiResponse.success(res, 200, 'Image removed.', product);
});

const remove = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  product.isDeleted = true;
  await product.save({ validateBeforeSave: false });
  await logAction({ adminId: req.user._id, action: 'DELETE', module: 'Product', targetId: product._id.toString(),
    description: `Deleted product: ${product.name}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Product deleted.');
});

// ─── Variations ────────────────────────────────────────────────────────────

const getVariations = asyncHandler(async (req, res) => {
  const vars = await ProductVariation.find({ product: req.params.id });
  return ApiResponse.success(res, 200, 'Variations retrieved.', vars);
});

const createVariation = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  const variation = await ProductVariation.create({ ...req.body, product: product._id });
  return ApiResponse.created(res, 'Variation created.', variation);
});

const updateVariation = asyncHandler(async (req, res) => {
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);
  const allowed = ['attributes', 'sku', 'images', 'status', 'sortOrder'];
  allowed.forEach(f => { if (req.body[f] !== undefined) variation[f] = req.body[f]; });
  await variation.save();
  return ApiResponse.success(res, 200, 'Variation updated.', variation);
});

const deleteVariation = asyncHandler(async (req, res) => {
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);
  variation.isDeleted = true;
  await variation.save({ validateBeforeSave: false });
  return ApiResponse.success(res, 200, 'Variation deleted.');
});

const BULK_MAX_ROWS = 200;

function bulkProductRowError(e) {
  if (e instanceof AppError) return e.message;
  if (e?.code === 11000) return 'Duplicate SKU or slug.';
  return e?.message || String(e);
}

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
  const stats = { categoriesCreated: 0 };
  const autoCreateCategories = req.body.autoCreateCategories === true;

  const boolField = (v, def = false) => {
    if (v === undefined || v === null || v === '') return def;
    return !['false', '0', 'no', 'n'].includes(String(v).toLowerCase().trim());
  };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const name = String(r.name || '').trim();
      const sku = String(r.sku || '').trim().toUpperCase();
      if (!name) throw new AppError('name is required.', 400);
      if (!sku) throw new AppError('sku is required.', 400);

      const category = await resolveCategoryFromRow(r, {
        autoCreate: autoCreateCategories,
        userId: req.user._id,
        stats,
      });
      const brand = await resolveBrandForProductRow(r);

      const gstRaw = r.gstPercentage ?? r.gst ?? 18;
      const gst = [0, 5, 12, 18, 28].includes(Number(gstRaw)) ? Number(gstRaw) : 18;
      const statusRaw = String(r.status || 'DRAFT').toUpperCase();
      const status = ['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(statusRaw) ? statusRaw : 'DRAFT';

      const referenceNumber = await generateRefNumber('PRODUCT');

      await Product.create({
        name,
        sku,
        category,
        brand,
        shortDescription: r.shortDescription != null ? String(r.shortDescription).trim() : null,
        description: r.description != null ? String(r.description).trim() : null,
        gstPercentage: gst,
        status,
        isFeatured: boolField(r.isFeatured, false),
        isTopSelling: boolField(r.isTopSelling, false),
        isAssured: boolField(r.isAssured, false),
        isExpress: boolField(r.isExpress, false),
        displayOrder:
          r.displayOrder !== undefined && r.displayOrder !== '' && Number.isFinite(Number(r.displayOrder))
            ? Number(r.displayOrder)
            : 0,
        referenceNumber,
        createdBy: req.user._id,
      });
      ok += 1;
    } catch (e) {
      errors.push({ row: i + 1, message: bulkProductRowError(e) });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'Product',
    targetId: batchId,
    description: `Bulk product import: ${ok} succeeded, ${errors.length} failed (${rows.length} rows)`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Bulk import completed.', {
    batchId,
    total: rows.length,
    succeeded: ok,
    failed: errors.length,
    errors,
    categoriesCreated: stats.categoriesCreated || 0,
    autoCreateCategories,
  });
});

module.exports = {
  getAll, getById, getBySlug, create, update, addImages, removeImage, remove, bulkImport,
  getVariations, createVariation, updateVariation, deleteVariation,
};
