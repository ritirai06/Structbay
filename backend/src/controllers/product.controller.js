const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const CategoryFilter = require('../models/CategoryFilter');
const City = require('../models/City');
const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');
const { deleteFile } = require('../config/cloudinary');
const { logAction } = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');
const { applySoftDelete } = require('../utils/softDeleteRelease');
const { resolveCategoryFromRow, escRx } = require('../utils/resolveCategoryFromRow');
const catalogBrowse = require('../services/catalogBrowse.service');
const productFull = require('../services/productFull.service');

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
  if (search) {
    const searchOr = await catalogBrowse.buildProductSearchOr(search);
    if (searchOr) filter.$or = searchOr.$or;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [products, total, activeTotal] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
    Product.countDocuments({ ...filter, status: 'ACTIVE' }),
  ]);
  const enriched = await productFull.enrichProductsSummary(products);
  return ApiResponse.success(res, 200, 'Products retrieved.', enriched, {
    total, active: activeTotal, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('brand', 'name slug logo');
  if (!product) throw new AppError('Product not found.', 404);
  const [variations, config] = await Promise.all([
    ProductVariation.find({ product: product._id }),
    productFull.getProductConfiguration(product._id),
  ]);
  return ApiResponse.success(res, 200, 'Product retrieved.', {
    ...product.toJSON(),
    variations,
    cityPricing: config.cityPricing,
    inventory: config.inventory,
    cityConfigs: config.cityConfigs,
    activeCities: config.activeCities,
  });
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
  const nested = productFull.hasNestedPayload(req.body);
  const { productFields, cityPricing, inventory } = nested
    ? productFull.extractNestedPayload(req.body)
    : { productFields: req.body, cityPricing: [], inventory: [] };

  const {
    name, sku, category, brand, shortDescription, description,
    gstPercentage, priceIncludesGst, status, isFeatured, isTopSelling, isAssured, isExpress,
    isStructbayAssured, isStructbayDelivery, assuredVerifiedAt, assuredVerifiedBy,
    structbayDeliverySupported, structbayDeliveryZones, structbayDeliveryLeadTimeDays,
    displayOrder, seo, faqs, videos, documents, returnExchangePolicy,
  } = productFields;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
  const referenceNumber = await generateRefNumber('PRODUCT');

    const [product] = await Product.create([{
    name, sku, category, brand, shortDescription, description,
    gstPercentage, priceIncludesGst, status, isFeatured, isTopSelling, isAssured, isExpress,
    isStructbayAssured, isStructbayDelivery, assuredVerifiedAt, assuredVerifiedBy,
    structbayDeliverySupported, structbayDeliveryZones, structbayDeliveryLeadTimeDays,
    displayOrder, seo, faqs, videos, documents, returnExchangePolicy,
    referenceNumber,
    createdBy: req.user._id,
    }], { session });

    if (cityPricing.length || inventory.length) {
      await productFull.saveProductConfiguration(
        product._id,
        { cityPricing, inventory },
        req.user._id,
        session,
        gstPercentage ?? 18
      );
    }

    await session.commitTransaction();

  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'Product', targetId: product._id.toString(),
    description: `Created product: ${product.name}`, ipAddress: req.ip, newData: { name: product.name, sku: product.sku } });

    const config = await productFull.getProductConfiguration(product._id);
    return ApiResponse.created(res, 'Product created.', {
      ...product.toJSON(),
      cityPricing: config.cityPricing,
      inventory: config.inventory,
      cityConfigs: config.cityConfigs,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

const update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  const nested = productFull.hasNestedPayload(req.body);
  const { productFields, cityPricing, inventory } = nested
    ? productFull.extractNestedPayload(req.body, product.gstPercentage)
    : { productFields: req.body, cityPricing: [], inventory: [] };

  const allowed = [
    'name', 'sku', 'category', 'brand', 'shortDescription', 'description',
    'gstPercentage', 'priceIncludesGst', 'status', 'isFeatured', 'isTopSelling', 'isAssured', 'isExpress',
    'isStructbayAssured', 'isStructbayDelivery', 'assuredVerifiedAt', 'assuredVerifiedBy',
    'structbayDeliverySupported', 'structbayDeliveryZones', 'structbayDeliveryLeadTimeDays',
    'displayOrder', 'seo', 'faqs', 'videos', 'documents', 'returnExchangePolicy',
  ];
  allowed.forEach(f => { if (productFields[f] !== undefined) product[f] = productFields[f]; });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await product.save({ session });

    if (cityPricing.length || inventory.length) {
      await productFull.saveProductConfiguration(
        product._id,
        { cityPricing, inventory },
        req.user._id,
        session,
        product.gstPercentage ?? 18
      );
    }

    await session.commitTransaction();

  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'Product', targetId: product._id.toString(),
    description: `Updated product: ${product.name}`, ipAddress: req.ip });

    const config = await productFull.getProductConfiguration(product._id);
    const variations = await ProductVariation.find({ product: product._id });
    return ApiResponse.success(res, 200, 'Product updated.', {
      ...product.toJSON(),
      variations,
      cityPricing: config.cityPricing,
      inventory: config.inventory,
      cityConfigs: config.cityConfigs,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
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
  const oldName = product.name;
  applySoftDelete(product, { fields: ['slug', 'sku'], nameMaxLength: 200 });
  await product.save({ validateBeforeSave: false });
  await logAction({ adminId: req.user._id, action: 'DELETE', module: 'Product', targetId: product._id.toString(),
    description: `Deleted product: ${oldName}`, ipAddress: req.ip });
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
  const allowed = [
    'attributes', 'sku', 'images', 'status', 'sortOrder',
    'mrp', 'weightKg', 'leadTimeDays', 'moq', 'vendorSku', 'vendorPrice',
  ];
  allowed.forEach(f => { if (req.body[f] !== undefined) variation[f] = req.body[f]; });
  await variation.save();
  return ApiResponse.success(res, 200, 'Variation updated.', variation);
});

const deleteVariation = asyncHandler(async (req, res) => {
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);
  applySoftDelete(variation, { fields: ['sku'] });
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
      const inclGst = boolField(r.priceIncludesGst ?? r.price_includes_gst ?? r.gstIncluded, false);
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
        priceIncludesGst: inclGst,
        status,
        isFeatured: boolField(r.isFeatured, false),
        isTopSelling: boolField(r.isTopSelling, false),
        isAssured: boolField(r.isAssured, false),
        isExpress: boolField(r.isExpress, false),
        isStructbayAssured: boolField(r.isStructbayAssured ?? r.structbayAssured, false),
        isStructbayDelivery: boolField(r.isStructbayDelivery ?? r.structbayDelivery, false),
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

const FIXED_ATTR = new Set(['weight', 'grade', 'size', 'color', 'finish', 'diameter']);

const RESERVED_VARIANT_ROW_KEYS = new Set([
  'productSku', 'parent_sku', 'parentSku', 'product_sku',
  'variantSku', 'variant_sku',
  'mrp', 'salePrice', 'price', 'selling_price', 'stock', 'cityId', 'city_id',
  'moq', 'leadTimeDays', 'lead_time', 'weightKg', 'weight_kg',
  'vendorSku', 'vendor_sku', 'vendorPrice', 'vendor_price',
]);

function mergeVariationAttributes(prev, next) {
  const p = prev && typeof prev === 'object' ? prev : {};
  const n = next && typeof next === 'object' ? next : {};
  const out = { ...p, ...n };
  delete out.custom;
  const prevC = Array.isArray(p.custom) ? p.custom : [];
  const nextC = Array.isArray(n.custom) ? n.custom : [];
  const map = new Map();
  prevC.forEach((c) => {
    if (c?.key) map.set(String(c.key).toLowerCase(), c);
  });
  nextC.forEach((c) => {
    if (c?.key) map.set(String(c.key).toLowerCase(), c);
  });
  out.custom = [...map.values()];
  return out;
}

function variantAttributesFromRow(row, filterKeys) {
  const attrs = { custom: [] };
  for (const fk of filterKeys) {
    if (RESERVED_VARIANT_ROW_KEYS.has(fk)) continue;
    const raw = row[fk];
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const val = String(raw).trim();
    if (FIXED_ATTR.has(fk)) attrs[fk] = val;
    else attrs.custom.push({ key: fk, value: val });
  }
  for (const k of FIXED_ATTR) {
    if (attrs[k]) continue;
    const raw = row[k];
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      attrs[k] = String(raw).trim();
    }
  }
  return attrs;
}

const getBulkImportTemplate = asyncHandler(async (req, res) => {
  const { categoryId, mode = 'variants' } = req.query;
  if (!categoryId || !mongoose.Types.ObjectId.isValid(String(categoryId))) {
    throw new AppError('Query parameter categoryId is required.', 400);
  }
  const category = await Category.findById(categoryId).select('name slug status').lean();
  if (!category) throw new AppError('Category not found.', 404);

  const cf = await CategoryFilter.findOne({ category: categoryId }).lean();
  const dyn = (cf?.filters || [])
    .filter((f) => f.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const baseProductCols = [
    { key: 'name', label: 'Product Name', group: 'product', required: true },
    { key: 'sku', label: 'Parent SKU', group: 'product', required: mode === 'products' },
    { key: 'brandName', label: 'Brand Name', group: 'product', required: true },
    { key: 'categorySlug', label: 'Category Slug', group: 'product', required: false },
    { key: 'shortDescription', label: 'Short Description', group: 'product', required: false },
    { key: 'description', label: 'Description', group: 'product', required: false },
  ];

  const variantCols = [
    { key: 'productSku', label: 'Parent Product SKU', group: 'variant', required: true },
    { key: 'variantSku', label: 'Variant SKU', group: 'variant', required: true },
    { key: 'mrp', label: 'MRP', group: 'pricing', required: false },
    { key: 'salePrice', label: 'Sale Price (city)', group: 'pricing', required: true },
    { key: 'stock', label: 'Stock (city)', group: 'inventory', required: true },
    { key: 'cityId', label: 'City ID', group: 'inventory', required: true },
    { key: 'moq', label: 'MOQ', group: 'variant', required: false },
    { key: 'leadTimeDays', label: 'Lead Time (days)', group: 'variant', required: false },
    { key: 'weightKg', label: 'Weight (kg)', group: 'variant', required: false },
    { key: 'vendorSku', label: 'Vendor SKU', group: 'vendor', required: false },
    { key: 'vendorPrice', label: 'Vendor Price', group: 'vendor', required: false },
  ];

  const dynCols = dyn.map((f) => ({
    key: f.key,
    label: f.label,
    group: mode === 'products' ? 'product_attribute' : 'variant_attribute',
    filterType: f.type,
    required: false,
    options: f.options || [],
    sortOrder: f.sortOrder,
  }));

  const columns = mode === 'products'
    ? [
      ...baseProductCols,
      ...dynCols,
      { key: 'gstPercentage', label: 'GST %', group: 'product', required: false },
      { key: 'priceIncludesGst', label: 'Price incl. GST (true|false)', group: 'product', required: false },
      { key: 'status', label: 'Status (DRAFT|ACTIVE|ARCHIVED)', group: 'product', required: false },
      { key: 'isAssured', label: 'Legacy Assured', group: 'badges', required: false },
      { key: 'isExpress', label: 'Legacy Express', group: 'badges', required: false },
      { key: 'isStructbayAssured', label: 'StructBay Assured', group: 'badges', required: false },
      { key: 'isStructbayDelivery', label: 'StructBay Delivery', group: 'badges', required: false },
    ]
    : [...variantCols.slice(0, 2), ...dynCols, ...variantCols.slice(2)];

  return ApiResponse.success(res, 200, 'Bulk import template.', {
    mode,
    categoryId: String(category._id),
    category,
    columns,
    generatedAt: new Date().toISOString(),
  });
});

const bulkImportVariants = asyncHandler(async (req, res) => {
  const { rows, cityId: bodyCityId } = req.body;
  if (!Array.isArray(rows)) throw new AppError('rows must be an array.', 400);
  if (!rows.length) throw new AppError('rows cannot be empty.', 400);
  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(`Too many rows (max ${BULK_MAX_ROWS}).`, 400);
  }

  const errors = [];
  let ok = 0;
  const batchId = new mongoose.Types.ObjectId().toString();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const productSku = String(r.productSku || r.parentSku || r.product_sku || r.parent_sku || '').trim().toUpperCase();
      const variantSku = String(r.variantSku || r.variant_sku || '').trim();
      const rowCity = r.cityId || r.city_id || bodyCityId;
      if (!productSku) throw new AppError('productSku (parent sku) is required.', 400);
      if (!variantSku) throw new AppError('variantSku is required.', 400);
      if (!rowCity || !mongoose.Types.ObjectId.isValid(String(rowCity))) {
        throw new AppError('cityId is required on each row (or once in request body).', 400);
      }

      const city = await City.findOne({ _id: rowCity, status: 'ACTIVE', isServiceable: true }).select('_id').lean();
      if (!city) throw new AppError('Invalid or non-serviceable cityId.', 400);

      const product = await Product.findOne({ sku: productSku });
      if (!product) throw new AppError(`Product not found for sku ${productSku}.`, 404);

      const cf = await CategoryFilter.findOne({ category: product.category }).lean();
      const filterKeys = (cf?.filters || []).filter((f) => f.isActive !== false).map((f) => f.key);
      const attrs = variantAttributesFromRow(r, filterKeys);

      let variation = await ProductVariation.findOne({ product: product._id, sku: variantSku });
      const moq = r.moq !== undefined && r.moq !== '' && Number.isFinite(Number(r.moq)) ? Math.max(1, Number(r.moq)) : undefined;
      const leadRaw = r.leadTimeDays ?? r.lead_time;
      const leadTimeDays = leadRaw !== undefined && leadRaw !== '' ? Number(leadRaw) : null;
      const weightRaw = r.weightKg ?? r.weight_kg;
      const weightKg = weightRaw !== undefined && weightRaw !== '' ? Number(weightRaw) : null;
      const mrp = r.mrp !== undefined && r.mrp !== '' ? Number(r.mrp) : null;
      const vendorSku = r.vendorSku || r.vendor_sku || null;
      const vendorPriceRaw = r.vendorPrice ?? r.vendor_price;
      const vendorPrice = vendorPriceRaw !== undefined && vendorPriceRaw !== '' ? Number(vendorPriceRaw) : null;

      const salePrice = Number(r.salePrice ?? r.price ?? r.selling_price);
      if (!Number.isFinite(salePrice) || salePrice < 0) throw new AppError('salePrice (or price) must be a valid number.', 400);

      const stock = Number(r.stock);
      if (!Number.isFinite(stock) || stock < 0) throw new AppError('stock must be a valid non-negative number.', 400);

      if (!variation) {
        variation = await ProductVariation.create({
          product: product._id,
          sku: variantSku,
          attributes: attrs,
          moq: moq ?? 1,
          leadTimeDays: Number.isFinite(leadTimeDays) ? leadTimeDays : null,
          weightKg: Number.isFinite(weightKg) ? weightKg : null,
          mrp: Number.isFinite(mrp) && mrp >= 0 ? mrp : null,
          vendorSku: vendorSku ? String(vendorSku).trim() : null,
          vendorPrice: Number.isFinite(vendorPrice) && vendorPrice >= 0 ? vendorPrice : null,
        });
      } else {
        variation.attributes = mergeVariationAttributes(variation.attributes, attrs);
        if (moq !== undefined) variation.moq = moq;
        if (Number.isFinite(leadTimeDays)) variation.leadTimeDays = leadTimeDays;
        if (Number.isFinite(weightKg)) variation.weightKg = weightKg;
        if (Number.isFinite(mrp) && mrp >= 0) variation.mrp = mrp;
        if (vendorSku != null) variation.vendorSku = String(vendorSku).trim() || null;
        if (Number.isFinite(vendorPrice) && vendorPrice >= 0) variation.vendorPrice = vendorPrice;
        await variation.save();
      }

      const reg = Number.isFinite(mrp) && mrp >= 0 ? mrp : salePrice;

      await CityPricing.findOneAndUpdate(
        { product: product._id, variation: variation._id, city: city._id },
        {
          $set: {
            regularPrice: reg,
            salePrice,
            isVisible: true,
            isDeleted: false,
            updatedBy: req.user._id,
          },
        },
        { upsert: true, new: true }
      );

      await Inventory.findOneAndUpdate(
        { product: product._id, variation: variation._id, city: city._id },
        {
          $set: {
            quantity: stock,
            isDeleted: false,
            updatedBy: req.user._id,
          },
        },
        { upsert: true, new: true }
      );

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
    description: `Bulk variant import: ${ok} succeeded, ${errors.length} failed (${rows.length} rows)`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Variant bulk import completed.', {
    batchId,
    total: rows.length,
    succeeded: ok,
    failed: errors.length,
    errors,
  });
});

module.exports = {
  getAll, getById, getBySlug, create, update, addImages, removeImage, remove, bulkImport, bulkImportVariants,
  getBulkImportTemplate,
  getVariations, createVariation, updateVariation, deleteVariation,
};
