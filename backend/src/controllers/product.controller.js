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
const { resolveCategoryFromRow, escRx } = require('../utils/resolveCategoryFromRow');
const catalogBrowse = require('../services/catalogBrowse.service');
const productFull = require('../services/productFull.service');
const { resolveVariantSku } = require('../services/variationSku.service');
const { normalizeVariationAttributes, packageAttributesForSave } = require('../utils/variationAttributes');
const { attributeValuesEquivalent } = require('../utils/attributeValueNormalize');
const { isValidCssColor } = require('../utils/colorValidation');
const { VALID_DELIVERY_TYPES } = require('../utils/productDeliveryType');
const { VALID_PRODUCT_STRUCTURES } = require('../utils/productStructure');

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
    .populate('brand', 'name slug logo')
    .populate('upsellProducts', 'name sku')
    .populate('crossSellProducts', 'name sku');
  if (!product) throw new AppError('Product not found.', 404);
  const [variations, config] = await Promise.all([
    ProductVariation.find({ product: product._id }),
    productFull.getProductConfiguration(product._id),
  ]);
  // Enrich product with computed pricing fields (same as product listing)
  const enrichedArr = await productFull.enrichProductsSummary([product]);
  const enriched = enrichedArr[0];
  return ApiResponse.success(res, 200, 'Product retrieved.', {
    ...enriched,
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
    isStructbayAssured, isStructbayDelivery, deliveryType, assuredVerifiedAt, assuredVerifiedBy,
    structbayDeliverySupported, structbayDeliveryZones, structbayDeliveryLeadTimeDays,
    displayOrder, seo, faqs, videos, documents, returnExchangePolicy, productStructure, attributes,
  } = productFields;

  const structureRaw = String(productStructure || 'simple').toLowerCase();
  const resolvedStructure = VALID_PRODUCT_STRUCTURES.includes(structureRaw) ? structureRaw : 'simple';

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
  const referenceNumber = await generateRefNumber('PRODUCT');

    const [product] = await Product.create([{
    name, sku, category, brand, shortDescription, description,
    gstPercentage, priceIncludesGst, status, isFeatured, isTopSelling, isAssured, isExpress,
    isStructbayAssured, isStructbayDelivery, deliveryType, assuredVerifiedAt, assuredVerifiedBy,
    structbayDeliverySupported, structbayDeliveryZones, structbayDeliveryLeadTimeDays,
    displayOrder, seo, faqs, videos, documents, returnExchangePolicy, attributes,
    productStructure: resolvedStructure,
    referenceNumber,
    createdBy: req.user._id,
    }], { session });

    if (resolvedStructure === 'simple' && (cityPricing.length || inventory.length)) {
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
    'isStructbayAssured', 'isStructbayDelivery', 'deliveryType', 'assuredVerifiedAt', 'assuredVerifiedBy',
    'structbayDeliverySupported', 'structbayDeliveryZones', 'structbayDeliveryLeadTimeDays',
    'displayOrder', 'seo', 'faqs', 'videos', 'documents', 'returnExchangePolicy', 'productStructure',
    'upsellProducts', 'crossSellProducts', 'attributes',
  ];
  allowed.forEach(f => { if (productFields[f] !== undefined) product[f] = productFields[f]; });

  if (productFields.productStructure === 'simple') {
    const vCount = await ProductVariation.countDocuments({
      product: product._id,
      status: 'ACTIVE',
      isDeleted: { $ne: true },
    });
    if (vCount > 0) {
      throw new AppError('Cannot switch to Simple Product while active variants exist. Remove variants first.', 400);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await product.save({ session });

    if (product.productStructure === 'variant') {
      await CityPricing.deleteMany(
        { product: product._id, variation: null },
        { session }
      );
      await Inventory.deleteMany(
        { product: product._id, variation: null },
        { session }
      );
    }

    const isVariantProduct = product.productStructure === 'variant';
    if (!isVariantProduct && (cityPricing.length || inventory.length)) {
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
  await Promise.all([
    CityPricing.deleteMany({ product: product._id }),
    Inventory.deleteMany({ product: product._id }),
    ProductVariation.deleteMany({ product: product._id }),
    Product.deleteOne({ _id: product._id }),
  ]);
  await logAction({ adminId: req.user._id, action: 'DELETE', module: 'Product', targetId: product._id.toString(),
    description: `Deleted product: ${oldName}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Product deleted.');
});

// ─── Variations ────────────────────────────────────────────────────────────

const getVariations = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('_id gstPercentage').lean();
  if (!product) throw new AppError('Product not found.', 404);

  const vars = await ProductVariation.find({ product: req.params.id }).sort({ sortOrder: 1, createdAt: 1 });
  const enriched = await Promise.all(vars.map(async (v) => {
    const config = await productFull.getVariationConfiguration(product._id, v._id);
    return {
      ...v.toJSON(),
      cityConfigs: config.cityConfigs,
    };
  }));
  return ApiResponse.success(res, 200, 'Variations retrieved.', enriched);
});

const createVariation = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  if (product.productStructure === 'simple') {
    throw new AppError('Change product structure to Variant Product and save before adding variants.', 400);
  }

  const flatAttributes = normalizeVariationAttributes(req.body);
  if (!Object.keys(flatAttributes).length) {
    throw new AppError('Add at least one attribute (e.g. Size → 10 KG).', 400);
  }
  const attributes = packageAttributesForSave(flatAttributes);

  const sku = await resolveVariantSku({
    product,
    requestedSku: req.body.sku,
    attributes,
  });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [variation] = await ProductVariation.create([{
      product: product._id,
      attributes,
      sku,
      status: req.body.status || 'ACTIVE',
      sortOrder: req.body.sortOrder ?? 0,
      mrp: req.body.mrp,
      moq: req.body.moq,
      leadTimeDays: req.body.leadTimeDays,
      weightKg: req.body.weightKg,
      vendorSku: req.body.vendorSku,
      vendorPrice: req.body.vendorPrice,
      barcode: req.body.barcode,
    }], { session });

    const { cityPricing, inventory } = productFull.extractNestedPayload(req.body, product.gstPercentage);
    if (cityPricing.length || inventory.length) {
      await productFull.saveVariationConfiguration(
        product._id,
        variation._id,
        { cityPricing, inventory },
        req.user._id,
        session,
        product.gstPercentage ?? 18
      );
    }

    await session.commitTransaction();

    const config = await productFull.getVariationConfiguration(product._id, variation._id);
    return ApiResponse.created(res, 'Variation created.', {
      ...variation.toJSON(),
      cityConfigs: config.cityConfigs,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

const updateVariation = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);

  if (req.body.attributePairs || req.body.attributes) {
    const flatAttributes = normalizeVariationAttributes(req.body);
    variation.attributes = packageAttributesForSave(flatAttributes);
  }

  if (req.body.sku !== undefined) {
    variation.sku = await resolveVariantSku({
      product,
      requestedSku: req.body.sku,
      attributes: variation.attributes,
      variationId: variation._id,
    });
  } else if ((req.body.attributePairs || req.body.attributes) && !variation.sku) {
    variation.sku = await resolveVariantSku({
      product,
      requestedSku: null,
      attributes: variation.attributes,
      variationId: variation._id,
    });
  }

  const allowed = [
    'images', 'status', 'sortOrder',
    'mrp', 'weightKg', 'leadTimeDays', 'moq', 'vendorSku', 'vendorPrice', 'barcode',
  ];
  allowed.forEach((f) => { if (req.body[f] !== undefined) variation[f] = req.body[f]; });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await variation.save({ session });

    const nested = productFull.hasNestedPayload(req.body);
    if (nested || Array.isArray(req.body.cityPricing) || Array.isArray(req.body.inventory)) {
      const { cityPricing, inventory } = productFull.extractNestedPayload(req.body, product.gstPercentage);
      if (cityPricing.length || inventory.length) {
        await productFull.saveVariationConfiguration(
          product._id,
          variation._id,
          { cityPricing, inventory },
          req.user._id,
          session,
          product.gstPercentage ?? 18
        );
      }
    }

    await session.commitTransaction();

    const config = await productFull.getVariationConfiguration(product._id, variation._id);
    return ApiResponse.success(res, 200, 'Variation updated.', {
      ...variation.toJSON(),
      cityConfigs: config.cityConfigs,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

const getVariationConfiguration = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('_id').lean();
  if (!product) throw new AppError('Product not found.', 404);
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id }).select('_id').lean();
  if (!variation) throw new AppError('Variation not found.', 404);
  const config = await productFull.getVariationConfiguration(product._id, variation._id);
  return ApiResponse.success(res, 200, 'Variation configuration retrieved.', config);
});

const saveVariationConfiguration = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);

  const { cityPricing, inventory } = productFull.extractNestedPayload(req.body, product.gstPercentage);
  await productFull.saveVariationConfiguration(
    product._id,
    variation._id,
    { cityPricing, inventory },
    req.user._id,
    null,
    product.gstPercentage ?? 18
  );

  const config = await productFull.getVariationConfiguration(product._id, variation._id);
  return ApiResponse.success(res, 200, 'Variation configuration saved.', config);
});

const generateVariationMatrix = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  if (product.productStructure !== 'variant') {
    throw new AppError('Change product structure to Variant Product before generating variants.', 400);
  }

  const { axes } = req.body; // [{key:string, values:[{value:string, colorCode?:string}]}]
  if (!Array.isArray(axes) || !axes.length) throw new AppError('axes array is required.', 400);
  for (const axis of axes) {
    if (!axis.key || !Array.isArray(axis.values) || !axis.values.length) {
      throw new AppError(`Each axis must have a key and at least one value.`, 400);
    }
    if (String(axis.key).trim().toLowerCase() === 'color') {
      for (const rawValue of axis.values) {
        const value = typeof rawValue === 'object' ? rawValue : { value: rawValue };
        const colorCode = String(value.colorCode || '').trim();
        const colorName = String(value.value || '').trim();
        if (colorCode && !isValidCssColor(colorCode)) {
          throw new AppError(`Invalid color code "${colorCode}" for ${colorName || 'Color'}.`, 400);
        }
        if (!colorCode && colorName && !isValidCssColor(colorName)) {
          throw new AppError(`Add a valid color code for "${colorName}".`, 400);
        }
      }
    }
  }

  // Cartesian product
  function cartesian(arrays) {
    return arrays.reduce(
      (acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])),
      [[]]
    );
  }

  const axisArrays = axes.map((a) =>
    a.values.map((v) => ({ axisKey: a.key, value: typeof v === 'object' ? v.value : String(v), colorCode: typeof v === 'object' ? v.colorCode || null : null }))
  );
  const combinations = cartesian(axisArrays);

  if (combinations.length > 500) throw new AppError(`Matrix would generate ${combinations.length} variants (max 500). Reduce attribute values.`, 400);

  const created = [];
  const skipped = [];

  for (const combo of combinations) {
    const pairsForSave = combo.map((cell) => ({ name: cell.axisKey, value: cell.value }));
    if (combo.some((c) => c.colorCode)) {
      const colorCell = combo.find((c) => c.colorCode);
      if (colorCell) pairsForSave.push({ name: `${colorCell.axisKey}_code`, value: colorCell.colorCode });
    }

    const flatAttributes = normalizeVariationAttributes({ attributePairs: pairsForSave });
    if (!Object.keys(flatAttributes).length) continue;

    const attributes = packageAttributesForSave(flatAttributes);

    // Skip if combination already exists
    const existing = await ProductVariation.findOne({ product: product._id, isDeleted: { $ne: true } }).lean().then(async () => {
      const all = await ProductVariation.find({ product: product._id, isDeleted: { $ne: true } }).select('attributes').lean();
      const { attributeValuesEquivalent } = require('../utils/attributeValueNormalize');
      return all.find((v) => {
        const existFlat = normalizeVariationAttributes({ attributes: v.attributes });
        const newFlat = { ...flatAttributes };
        const keys = new Set([...Object.keys(existFlat), ...Object.keys(newFlat)]);
        // Only check axis keys
        const axisKeys = combo.map((c) => c.axisKey.toLowerCase());
        return axisKeys.every((ak) => {
          const ev = existFlat[ak] || existFlat[Object.keys(existFlat).find((k) => k.toLowerCase() === ak) || ''];
          const nv = newFlat[ak] || newFlat[Object.keys(newFlat).find((k) => k.toLowerCase() === ak) || ''];
          return ev && nv && attributeValuesEquivalent(ev, nv, ak);
        }) && keys.size > 0;
      });
    });

    if (existing) {
      skipped.push(combo.map((c) => `${c.axisKey}:${c.value}`).join(' + '));
      continue;
    }

    const sku = await resolveVariantSku({ product, requestedSku: null, attributes });
    const variation = await ProductVariation.create({
      product: product._id,
      attributes,
      sku,
      status: 'ACTIVE',
      sortOrder: created.length,
    });
    created.push(variation);
  }

  return ApiResponse.created(res, `Generated ${created.length} variants (${skipped.length} already existed).`, {
    created,
    skipped,
    total: combinations.length,
  });
});

const deleteVariation = asyncHandler(async (req, res) => {
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);
  await Promise.all([
    CityPricing.deleteMany({ variation: variation._id }),
    Inventory.deleteMany({ variation: variation._id }),
    ProductVariation.deleteOne({ _id: variation._id }),
  ]);
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

      const deliveryRaw = String(r.deliveryType || r.delivery_type || '').trim().toLowerCase();
      let deliveryType = VALID_DELIVERY_TYPES.includes(deliveryRaw) ? deliveryRaw : null;
      if (!deliveryType && boolField(r.isStructbayDelivery ?? r.structbayDelivery, false)) {
        deliveryType = 'structbay_delivery';
      }
      if (!deliveryType) deliveryType = 'vendor_delivery';

      const structureRaw = String(r.productStructure || r.product_structure || 'simple').toLowerCase();
      const productStructure = VALID_PRODUCT_STRUCTURES.includes(structureRaw) ? structureRaw : 'simple';

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
        deliveryType,
        productStructure,
        isFeatured: boolField(r.isFeatured, false),
        isTopSelling: boolField(r.isTopSelling, false),
        isAssured: boolField(r.isAssured, false),
        isExpress: boolField(r.isExpress, false),
        isStructbayAssured: boolField(r.isStructbayAssured ?? r.structbayAssured, false),
        isStructbayDelivery: deliveryType === 'structbay_delivery',
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

const RESERVED_VARIANT_ROW_KEYS = new Set([
  'productSku', 'parent_sku', 'parentSku', 'product_sku',
  'variantSku', 'variant_sku',
  'mrp', 'salePrice', 'sale_price', 'price', 'selling_price', 'sellingPrice',
  'purchaseCost', 'purchase_cost',
  'wholesaleSlabs', 'wholesale_slabs', 'slabs',
  'stock', 'quantity',
  'reserved', 'reservedStock', 'reserved_stock',
  'lowStockThreshold', 'low_stock_threshold', 'reorderLevel', 'reorder_level',
  'safetyStock', 'safety_stock',
  'cityId', 'city_id', 'cityName', 'city_name', 'citySlug', 'city_slug',
  'moq', 'leadTimeDays', 'lead_time', 'weightKg', 'weight_kg',
  'vendorSku', 'vendor_sku', 'vendorPrice', 'vendor_price',
  'deliveryCharge', 'delivery_charge', 'taxPercentage', 'tax_percentage',
  'isVisible', 'is_visible', 'visible',
]);

function isReservedVariantKey(key) {
  if (!key) return true;
  const lower = String(key).toLowerCase();
  if (RESERVED_VARIANT_ROW_KEYS.has(key) || RESERVED_VARIANT_ROW_KEYS.has(lower)) return true;
  return false;
}

function mergeVariationAttributes(prev, next) {
  const a = normalizeVariationAttributes({ attributes: prev });
  const b = normalizeVariationAttributes({ attributes: next });
  return { ...a, ...b };
}

function variantAttributesFromRow(row, filterKeys = []) {
  const attributePairs = [];

  for (const [key, raw] of Object.entries(row)) {
    if (raw == null || String(raw).trim() === '') continue;
    if (isReservedVariantKey(key)) continue;
    const lower = String(key).toLowerCase();
    if (lower.startsWith('attr_') || lower.startsWith('attribute_')) {
      const name = String(key).replace(/^attr_/i, '').replace(/^attribute_/i, '').trim();
      if (name) attributePairs.push({ name, value: String(raw).trim() });
    }
  }

  for (const fk of filterKeys) {
    if (isReservedVariantKey(fk)) continue;
    if (attributePairs.some((p) => p.name.toLowerCase() === String(fk).toLowerCase())) continue;
    const raw = row[fk];
    if (raw != null && String(raw).trim()) {
      attributePairs.push({ name: fk, value: String(raw).trim() });
    }
  }

  for (const [key, raw] of Object.entries(row)) {
    if (raw == null || String(raw).trim() === '') continue;
    if (isReservedVariantKey(key)) continue;
    const lower = String(key).toLowerCase();
    if (lower.startsWith('attr_') || lower.startsWith('attribute_')) continue;
    if (attributePairs.some((p) => p.name.toLowerCase() === lower)) continue;
    attributePairs.push({ name: String(key).trim(), value: String(raw).trim() });
  }

  return normalizeVariationAttributes({ attributePairs });
}

function attributesMatch(a, b) {
  const na = normalizeVariationAttributes({ attributes: a });
  const nb = normalizeVariationAttributes({ attributes: b });
  if (!Object.keys(nb).length) return false;
  const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
  for (const k of keys) {
    if (!attributeValuesEquivalent(na[k], nb[k], k)) return false;
  }
  return true;
}

function parseCompactWholesaleSlabs(s) {
  const parts = s.split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 100) throw new AppError('At most 100 wholesale slabs.', 400);
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
  if (arr.length > 100) throw new AppError('At most 100 wholesale slabs.', 400);
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
  const raw = r.wholesaleSlabs ?? r.wholesale_slabs ?? r.slabs;
  if (raw == null || String(raw).trim() === '') return [];
  const s = String(raw).trim();
  if (s.startsWith('[') || s.startsWith('{')) return parseJsonWholesaleSlabs(s);
  return parseCompactWholesaleSlabs(s);
}

async function resolveCityFromVariantRow(r, bodyCityId) {
  const rowCity = r.cityId || r.city_id || bodyCityId;
  if (rowCity && mongoose.Types.ObjectId.isValid(String(rowCity))) {
    const city = await City.findOne({ _id: rowCity, status: 'ACTIVE', isServiceable: true }).select('_id').lean();
    if (!city) throw new AppError('Invalid or non-serviceable cityId.', 400);
    return city;
  }
  const name = String(r.cityName || r.city_name || r.citySlug || r.city_slug || '').trim();
  if (!name) {
    throw new AppError('cityId or cityName is required on each row (or cityId once in request body).', 400);
  }
  const city = await City.findOne({
    $or: [
      { name: new RegExp(`^${escRx(name)}$`, 'i') },
      { slug: name.toLowerCase().replace(/\s+/g, '-') },
    ],
    status: 'ACTIVE',
    isServiceable: true,
  }).select('_id').lean();
  if (!city) throw new AppError(`City not found: ${name}.`, 404);
  return city;
}

const getBulkImportTemplate = asyncHandler(async (req, res) => {
  const { categoryId, mode = 'variants' } = req.query;
  let category = null;
  let dyn = [];

  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(String(categoryId))) {
      throw new AppError('Invalid categoryId.', 400);
    }
    category = await Category.findById(categoryId).select('name slug status').lean();
    if (!category) throw new AppError('Category not found.', 404);
    const cf = await CategoryFilter.findOne({ category: categoryId }).lean();
    dyn = (cf?.filters || [])
      .filter((f) => f.isActive !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } else if (mode === 'variants') {
    throw new AppError('Query parameter categoryId is required for variant templates.', 400);
  }

  const baseProductCols = [
    { key: 'name', label: 'Product Name', group: 'product', required: true },
    { key: 'sku', label: 'Parent SKU', group: 'product', required: true },
    { key: 'brandName', label: 'Brand Name', group: 'product', required: true },
    { key: 'categorySlug', label: 'Category Slug', group: 'product', required: false },
    { key: 'shortDescription', label: 'Short Description', group: 'product', required: false },
    { key: 'description', label: 'Description', group: 'product', required: false },
  ];

  const variantCols = [
    { key: 'productSku', label: 'Parent Product SKU', group: 'variant', required: true },
    {
      key: 'variantSku',
      label: 'Variant SKU (optional — auto-generated from parent + attributes)',
      group: 'variant',
      required: false,
    },
    { key: 'mrp', label: 'MRP', group: 'pricing', required: false },
    { key: 'salePrice', label: 'Sale Price (city)', group: 'pricing', required: true },
    { key: 'purchaseCost', label: 'Purchase Cost', group: 'pricing', required: false },
    { key: 'wholesaleSlabs', label: 'Wholesale tiers (50:400|100:395)', group: 'pricing', required: false },
    { key: 'stock', label: 'Stock (city)', group: 'inventory', required: true },
    { key: 'reserved', label: 'Reserved stock', group: 'inventory', required: false },
    { key: 'lowStockThreshold', label: 'Low stock threshold', group: 'inventory', required: false },
    { key: 'safetyStock', label: 'Safety stock', group: 'inventory', required: false },
    { key: 'cityId', label: 'City ID (or cityName)', group: 'inventory', required: false },
    { key: 'cityName', label: 'City name', group: 'inventory', required: false },
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
    hint: 'Use column key as header, or attr_KeyName for custom attributes',
  }));

  const columns = mode === 'products'
    ? [
      ...baseProductCols,
      ...dynCols,
      { key: 'gstPercentage', label: 'GST %', group: 'product', required: false },
      { key: 'priceIncludesGst', label: 'Price incl. GST (true|false)', group: 'product', required: false },
      { key: 'status', label: 'Status (DRAFT|ACTIVE|ARCHIVED)', group: 'product', required: false },
      {
        key: 'deliveryType',
        label: 'Delivery (vendor_delivery|structbay_delivery)',
        group: 'product',
        required: false,
      },
      {
        key: 'productStructure',
        label: 'Structure (simple|variant)',
        group: 'product',
        required: false,
      },
      { key: 'isStructbayAssured', label: 'StructBay Assured', group: 'badges', required: false },
      { key: 'isFeatured', label: 'Featured', group: 'badges', required: false },
      { key: 'isTopSelling', label: 'Top selling', group: 'badges', required: false },
      { key: 'displayOrder', label: 'Display order', group: 'product', required: false },
    ]
    : [...variantCols.slice(0, 2), ...dynCols, ...variantCols.slice(2)];

  const sampleVariantRow = {
    productSku: 'PARENT-SKU-001',
    variantSku: '',
    mrp: '450',
    salePrice: '420',
    purchaseCost: '380',
    wholesaleSlabs: '50:400|100:395',
    stock: '500',
    reserved: '0',
    lowStockThreshold: '50',
    safetyStock: '10',
    cityName: 'Bengaluru',
    moq: '1',
  };
  dyn.forEach((f) => {
    sampleVariantRow[f.key] = (f.options && f.options[0]) || '';
  });

  const sampleProductRow = {
    name: 'Sample Product',
    sku: 'PARENT-SKU-001',
    brandName: 'UltraTech',
    categorySlug: category?.slug || 'cement',
    gstPercentage: '18',
    priceIncludesGst: 'false',
    status: 'DRAFT',
    deliveryType: 'vendor_delivery',
    productStructure: 'simple',
    shortDescription: 'Short text',
    displayOrder: '0',
    isStructbayAssured: 'false',
    isFeatured: 'false',
    isTopSelling: 'false',
  };
  dyn.forEach((f) => {
    sampleProductRow[f.key] = (f.options && f.options[0]) || '';
  });

  return ApiResponse.success(res, 200, 'Bulk import template.', {
    mode,
    categoryId: category ? String(category._id) : null,
    category,
    columns,
    sampleRows: mode === 'variants' ? [sampleVariantRow] : [sampleProductRow],
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

  const boolFromRow = (v, def = true) => {
    if (v === undefined || v === null || v === '') return def;
    return !['false', '0', 'no', 'n'].includes(String(v).toLowerCase().trim());
  };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const productSku = String(r.productSku || r.parentSku || r.product_sku || r.parent_sku || '').trim().toUpperCase();
      const variantSkuInput = String(r.variantSku || r.variant_sku || '').trim();
      if (!productSku) throw new AppError('productSku (parent sku) is required.', 400);

      const city = await resolveCityFromVariantRow(r, bodyCityId);

      const product = await Product.findOne({ sku: productSku });
      if (!product) throw new AppError(`Product not found for sku ${productSku}.`, 404);

      if (product.productStructure !== 'variant') {
        product.productStructure = 'variant';
        await product.save();
        await CityPricing.deleteMany({ product: product._id, variation: null });
        await Inventory.deleteMany({ product: product._id, variation: null });
      }

      const cf = await CategoryFilter.findOne({ category: product.category }).lean();
      const filterKeys = (cf?.filters || []).filter((f) => f.isActive !== false).map((f) => f.key);
      const attrs = variantAttributesFromRow(r, filterKeys);
      if (!Object.keys(attrs).length) {
        throw new AppError('At least one variant attribute column is required (category filters or attr_* columns).', 400);
      }

      let variation = null;
      if (variantSkuInput) {
        variation = await ProductVariation.findOne({ product: product._id, sku: variantSkuInput.toUpperCase() });
      } else {
        const existing = await ProductVariation.find({ product: product._id, isDeleted: { $ne: true } }).lean();
        const hit = existing.find((v) => attributesMatch(v.attributes, attrs));
        if (hit) variation = await ProductVariation.findById(hit._id);
      }

      const resolvedSku = await resolveVariantSku({
        product,
        requestedSku: variantSkuInput || variation?.sku,
        attributes: attrs,
        variationId: variation?._id,
      });

      const moq = r.moq !== undefined && r.moq !== '' && Number.isFinite(Number(r.moq)) ? Math.max(1, Number(r.moq)) : undefined;
      const leadRaw = r.leadTimeDays ?? r.lead_time;
      const leadTimeDays = leadRaw !== undefined && leadRaw !== '' ? Number(leadRaw) : null;
      const weightRaw = r.weightKg ?? r.weight_kg;
      const weightKg = weightRaw !== undefined && weightRaw !== '' ? Number(weightRaw) : null;
      const mrp = r.mrp !== undefined && r.mrp !== '' ? Number(r.mrp) : null;
      const vendorSku = r.vendorSku || r.vendor_sku || null;
      const vendorPriceRaw = r.vendorPrice ?? r.vendor_price;
      const vendorPrice = vendorPriceRaw !== undefined && vendorPriceRaw !== '' ? Number(vendorPriceRaw) : null;
      const purchaseCostRaw = r.purchaseCost ?? r.purchase_cost;
      const purchaseCost = purchaseCostRaw !== undefined && purchaseCostRaw !== '' ? Number(purchaseCostRaw) : null;

      const salePrice = Number(r.salePrice ?? r.sale_price ?? r.price ?? r.selling_price ?? r.sellingPrice);
      if (!Number.isFinite(salePrice) || salePrice < 0) throw new AppError('salePrice (or price) must be a valid number.', 400);

      const stock = Number(r.stock ?? r.quantity);
      if (!Number.isFinite(stock) || stock < 0) throw new AppError('stock must be a valid non-negative number.', 400);

      const reservedRaw = r.reserved ?? r.reservedStock ?? r.reserved_stock;
      const reserved = reservedRaw !== undefined && reservedRaw !== '' ? Number(reservedRaw) : null;
      const thresholdRaw = r.lowStockThreshold ?? r.low_stock_threshold ?? r.reorderLevel ?? r.reorder_level;
      const lowStockThreshold = thresholdRaw !== undefined && thresholdRaw !== '' ? Number(thresholdRaw) : null;
      const safetyRaw = r.safetyStock ?? r.safety_stock;
      const safetyStock = safetyRaw !== undefined && safetyRaw !== '' ? Number(safetyRaw) : null;

      const wholesaleSlabs = parseWholesaleSlabsFromRow(r);
      const isVisible = boolFromRow(r.isVisible ?? r.is_visible ?? r.visible, true);

      if (!variation) {
        variation = await ProductVariation.create({
          product: product._id,
          sku: resolvedSku,
          attributes: packageAttributesForSave(attrs),
          moq: moq ?? 1,
          leadTimeDays: Number.isFinite(leadTimeDays) ? leadTimeDays : null,
          weightKg: Number.isFinite(weightKg) ? weightKg : null,
          mrp: Number.isFinite(mrp) && mrp >= 0 ? mrp : null,
          vendorSku: vendorSku ? String(vendorSku).trim() : null,
          vendorPrice: Number.isFinite(vendorPrice) && vendorPrice >= 0 ? vendorPrice : null,
        });
      } else {
        variation.sku = resolvedSku;
        variation.attributes = packageAttributesForSave(mergeVariationAttributes(variation.attributes, attrs));
        if (moq !== undefined) variation.moq = moq;
        if (Number.isFinite(leadTimeDays)) variation.leadTimeDays = leadTimeDays;
        if (Number.isFinite(weightKg)) variation.weightKg = weightKg;
        if (Number.isFinite(mrp) && mrp >= 0) variation.mrp = mrp;
        if (vendorSku != null) variation.vendorSku = String(vendorSku).trim() || null;
        if (Number.isFinite(vendorPrice) && vendorPrice >= 0) variation.vendorPrice = vendorPrice;
        await variation.save();
      }

      const reg = Number.isFinite(mrp) && mrp >= 0 ? mrp : salePrice;

      const pricingSet = {
        regularPrice: reg,
        salePrice,
        isVisible,
        isDeleted: false,
        updatedBy: req.user._id,
      };
      if (wholesaleSlabs.length) pricingSet.wholesaleSlabs = wholesaleSlabs;
      if (Number.isFinite(purchaseCost) && purchaseCost >= 0) pricingSet.purchaseCost = purchaseCost;

      await CityPricing.findOneAndUpdate(
        { product: product._id, variation: variation._id, city: city._id },
        { $set: pricingSet },
        { upsert: true, new: true }
      );

      const inventorySet = {
        quantity: stock,
        isDeleted: false,
        updatedBy: req.user._id,
      };
      if (Number.isFinite(reserved) && reserved >= 0) inventorySet.reserved = reserved;
      if (Number.isFinite(lowStockThreshold) && lowStockThreshold >= 0) {
        inventorySet.lowStockThreshold = lowStockThreshold;
      }
      if (Number.isFinite(safetyStock) && safetyStock >= 0) inventorySet.safetyStock = safetyStock;

      await Inventory.findOneAndUpdate(
        { product: product._id, variation: variation._id, city: city._id },
        { $set: inventorySet },
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
  getVariationConfiguration, saveVariationConfiguration, generateVariationMatrix,
};
