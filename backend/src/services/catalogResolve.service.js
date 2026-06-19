const Product = require('../models/Product');
const { isValidId } = require('../lib/apiShape');
const ProductVariation = require('../models/ProductVariation');
const VendorVariantPricing = require('../models/VendorVariantPricing');
const CityPricing = require('../models/CityPricing');

const MAX_PRODUCTS = 2000;

/**
 * Status filter for admin catalogs.
 * Default: ACTIVE only (storefront parity).
 * `includeDrafts: true` or `status: 'ALL'` → DRAFT + ACTIVE (typical dev DB has only drafts).
 */
function statusConditions(filters = {}) {
  const f = filters || {};
  if (f.status === 'ALL' || f.includeDrafts === true) {
    return { status: { $in: ['DRAFT', 'ACTIVE'] } };
  }
  if (f.status === 'DRAFT' || f.status === 'ACTIVE' || f.status === 'ARCHIVED') {
    return { status: f.status };
  }
  return { status: 'ACTIVE' };
}

/**
 * Build Mongo filter from admin filters (StructBay badges, status, category, brand).
 */
function productFilterFromPayload({ filters = {}, scopeType, categoryId, brandId, productIds }) {
  const f = { ...filters };
  const q = {};
  Object.assign(q, statusConditions(f));

  if (f.categoryId && isValidId(f.categoryId)) q.category = f.categoryId;
  if (f.brandId && isValidId(f.brandId)) q.brand = f.brandId;

  if (f.structbayAssured === true || f.structbayAssured === 'true') q.isStructbayAssured = true;
  if (f.structbayDelivery === true || f.structbayDelivery === 'true') q.isStructbayDelivery = true;
  if (f.isTopSelling === true || f.isTopSelling === 'true') q.isTopSelling = true;
  if (f.isFeatured === true || f.isFeatured === 'true') q.isFeatured = true;

  if (scopeType === 'CATEGORY' && categoryId && isValidId(categoryId)) {
    q.category = categoryId;
  }
  if (scopeType === 'BRAND' && brandId && isValidId(brandId)) {
    q.brand = brandId;
  }
  if (scopeType === 'SELECTED' && Array.isArray(productIds) && productIds.length) {
    const ids = productIds.filter((id) => isValidId(id)).slice(0, MAX_PRODUCTS);
    q._id = { $in: ids };
  }
  if (scopeType === 'PRODUCT' && f.productId && isValidId(f.productId)) {
    q._id = f.productId;
  }

  return q;
}

/**
 * @returns {Promise<{ products: any[], truncated: boolean }>}
 */
async function resolveCatalogProducts({
  scopeType,
  productId,
  productIds,
  categoryId,
  brandId,
  vendorUserId,
  filters = {},
}) {
  let truncated = false;

  if (scopeType === 'PRODUCT') {
    const pid = productId || filters.productId;
    if (!isValidId(pid)) return { products: [], truncated: false };
    const p = await Product.findOne({ _id: pid, ...statusConditions(filters) })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();
    return { products: p ? [p] : [], truncated: false };
  }

  if (scopeType === 'VENDOR') {
    if (!isValidId(vendorUserId)) return { products: [], truncated: false };
    const vps = await VendorVariantPricing.find({ vendorUser: vendorUserId, isActive: true })
      .select('variant')
      .lean();
    const variantIds = [...new Set(vps.map((x) => String(x.variant)).filter(Boolean))];
    if (!variantIds.length) return { products: [], truncated: false };
    const vars = await ProductVariation.find({ _id: { $in: variantIds } }).select('product').lean();
    const productIdSet = [...new Set(vars.map((v) => String(v.product)))];
    const slice = productIdSet.slice(0, MAX_PRODUCTS);
    truncated = productIdSet.length > MAX_PRODUCTS;
    const q = { _id: { $in: slice }, ...statusConditions(filters) };
    const list = await Product.find(q)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ name: 1 })
      .lean();
    return { products: list, truncated };
  }

  if (scopeType === 'ALL') {
    const q = productFilterFromPayload({ filters, scopeType: 'ALL' });
    const total = await Product.countDocuments(q);
    const list = await Product.find(q)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ displayOrder: 1, name: 1 })
      .limit(MAX_PRODUCTS)
      .lean();
    return { products: list, truncated: total > MAX_PRODUCTS };
  }

  if (scopeType === 'SELECTED') {
    const ids = (productIds || []).filter((id) => isValidId(id)).slice(0, MAX_PRODUCTS);
    truncated = (productIds || []).length > MAX_PRODUCTS;
    if (!ids.length) return { products: [], truncated };
    // Admin explicitly picked rows — do not drop DRAFT products that appear in the admin grid.
    const list = await Product.find({ _id: { $in: ids } })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();
    return { products: list, truncated };
  }

  const q = productFilterFromPayload({
    filters,
    scopeType,
    categoryId,
    brandId,
    productIds,
  });

  const total = await Product.countDocuments(q);
  const list = await Product.find(q)
    .populate('category', 'name slug')
    .populate('brand', 'name slug logo')
    .sort({ displayOrder: 1, name: 1 })
    .limit(MAX_PRODUCTS)
    .lean();
  truncated = total > MAX_PRODUCTS;
  return { products: list, truncated };
}

async function loadVariationsMap(productIds) {
  if (!productIds.length) return new Map();
  const vars = await ProductVariation.find({
    product: { $in: productIds },
    status: 'ACTIVE',
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  const map = new Map();
  vars.forEach((v) => {
    const k = String(v.product);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  });
  return map;
}

/** Optional city pricing for includePricing */
async function loadPricingMap(productIds, cityId) {
  if (!cityId || !isValidId(cityId) || !productIds.length) return new Map();
  const rows = await CityPricing.find({
    city: cityId,
    product: { $in: productIds },
    isDeleted: false,
  })
    .select('product variation regularPrice salePrice')
    .lean();
  const map = new Map();
  rows.forEach((r) => {
    const pk = `${String(r.product)}:${r.variation ? String(r.variation) : 'base'}`;
    map.set(pk, r);
  });
  return map;
}

function humanizeAttrKey(key) {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Dynamic spec rows from variant.attributes + product fields (PIM-ready: no hardcoded product-type tables). */
function dynamicSpecifications(product, variant) {
  const rows = [];
  if (product?.shortDescription) {
    rows.push({ label: 'Summary', value: String(product.shortDescription).slice(0, 500) });
  }
  if (variant?.attributes && typeof variant.attributes === 'object') {
    const a = variant.attributes;
    const skip = new Set(['custom']);
    Object.keys(a).forEach((key) => {
      if (skip.has(key)) return;
      const val = a[key];
      if (val == null || val === '') return;
      if (typeof val === 'object' && !Array.isArray(val)) return;
      rows.push({ label: humanizeAttrKey(key), value: String(val).slice(0, 240) });
    });
    (a.custom || []).forEach((c) => {
      if (c?.key && c?.value) rows.push({ label: String(c.key), value: String(c.value) });
    });
  }
  return rows;
}

async function buildCatalogBundles(products, options = {}) {
  const ids = products.map((p) => p._id);
  const varMap = await loadVariationsMap(ids);
  const pricingMap = options.includePricing && options.cityId
    ? await loadPricingMap(ids, options.cityId)
    : new Map();

  const bundles = [];
  for (const p of products) {
    const pid = String(p._id);
    const variations = varMap.get(pid) || [];
    const docs = (p.documents || []).filter((d) => d?.url);
    bundles.push({
      product: p,
      variations,
      documents: docs,
      pricingFor(variant) {
        if (!options.includePricing) return null;
        const keyVar = `${pid}:${variant ? String(variant._id) : 'base'}`;
        const keyBase = `${pid}:base`;
        return pricingMap.get(keyVar) || pricingMap.get(keyBase) || null;
      },
      specificationsFor(variant) {
        return dynamicSpecifications(p, variant);
      },
    });
  }
  return bundles;
}

module.exports = {
  resolveCatalogProducts,
  loadVariationsMap,
  buildCatalogBundles,
  productFilterFromPayload,
  dynamicSpecifications,
  statusConditions,
  MAX_PRODUCTS,
};
