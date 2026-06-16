const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const CityPricing = require('../models/CityPricing');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const marketplaceCity = require('./marketplaceCity.service');
const { escRx } = require('../utils/resolveCategoryFromRow');

const FIXED_ATTR_KEYS = new Set(['weight', 'grade', 'size', 'color', 'finish', 'diameter']);

/** @param {unknown} v */
function parseCommaList(v) {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.flatMap((x) => parseCommaList(x));
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Products in category whose ACTIVE variations match ALL active attribute filters from query.
 * Keys must exist on the category's CategoryFilter doc (admin-defined "category attributes").
 * Values map to ProductVariation.attributes fixed fields or attributes.custom (key/value).
 *
 * @param {import('mongoose').Types.ObjectId|string} categoryId
 * @param {Record<string, unknown>} query
 * @param {{ filters?: Array<{ key?: string, isActive?: boolean }> }>|null|undefined} categoryFilterDoc
 * @returns {Promise<import('mongoose').Types.ObjectId[]|null>} null = no narrowing; [] = impossible match
 */
async function narrowProductsByCategoryAttributeFilters(categoryId, query, categoryFilterDoc) {
  const defs = (categoryFilterDoc?.filters || []).filter((f) => f && f.key && f.isActive !== false);
  if (!defs.length) return null;

  const activeKeys = new Set(defs.map((d) => String(d.key).toLowerCase()));
  const andParts = [];

  for (const key of activeKeys) {
    const raw = query[key] !== undefined && query[key] !== '' ? query[key] : query[`attr_${key}`];
    const vals = parseCommaList(raw);
    if (!vals.length) continue;

    if (FIXED_ATTR_KEYS.has(key)) {
      andParts.push(vals.length === 1 ? { [`attributes.${key}`]: vals[0] } : { [`attributes.${key}`]: { $in: vals } });
    } else {
      const rx = new RegExp(`^${escRx(key)}$`, 'i');
      andParts.push({
        'attributes.custom': {
          $elemMatch: {
            key: rx,
            value: vals.length === 1 ? vals[0] : { $in: vals },
          },
        },
      });
    }
  }

  if (!andParts.length) return null;

  const catOid = mongoose.Types.ObjectId.isValid(String(categoryId))
    ? new mongoose.Types.ObjectId(String(categoryId))
    : null;
  if (!catOid) return null;

  const productIdsInCat = await Product.find({ category: catOid, status: 'ACTIVE' }).distinct('_id');
  if (!productIdsInCat.length) return [];

  const match = {
    status: 'ACTIVE',
    product: { $in: productIdsInCat },
    $and: andParts,
  };

  return ProductVariation.distinct('product', match);
}

/**
 * @param {unknown[]} baseList
 * @param {unknown[]} narrowList
 */
function intersectIdLists(baseList, narrowList) {
  if (narrowList == null) return baseList || [];
  if (narrowList.length === 0) return [];
  const narrow = new Set(narrowList.map((id) => String(id)));
  return (baseList || []).filter((id) => narrow.has(String(id)));
}

/**
 * @param {string|undefined} search
 * @returns {Promise<{ $or: object[] }|null>}
 */
async function buildProductSearchOr(search) {
  const q = String(search || '').trim();
  if (!q) return null;
  const rx = new RegExp(escRx(q), 'i');
  const [vIds, brands] = await Promise.all([
    ProductVariation.find({
      status: 'ACTIVE',
      $or: [{ sku: rx }, { vendorSku: rx }, { searchText: rx }],
    }).distinct('product'),
    Brand.find({ name: rx }).select('_id').lean(),
  ]);
  const or = [{ name: rx }, { sku: rx }];
  if (vIds.length) or.push({ _id: { $in: vIds } });
  if (brands.length) or.push({ brand: { $in: brands.map((b) => b._id) } });
  return { $or: or };
}

/**
 * Assured / delivery filters: include legacy `isAssured` / `isExpress` OR new StructBay flags.
 * @param {Record<string, unknown>} filter mongoose query object (mutated)
 * @param {Record<string, unknown>} query req.query
 */
function applyLegacyAndStructBayBadgeFilters(filter, query) {
  const assured = query.assured === 'true' || query.structbayAssured === 'true';
  const delivery = query.express === 'true' || query.structbayDelivery === 'true';
  if (!assured && !delivery) return;
  filter.$and = filter.$and || [];
  if (assured) {
    filter.$and.push({ $or: [{ isStructbayAssured: true }, { isAssured: true }] });
  }
  if (delivery) {
    filter.$and.push({ $or: [{ isStructbayDelivery: true }, { isExpress: true }] });
  }
}

async function distinctProductsMatchingPriceRange(cityOid, minPrice, maxPrice) {
  const min = minPrice !== undefined && minPrice !== '' && Number.isFinite(Number(minPrice)) ? Number(minPrice) : null;
  const max = maxPrice !== undefined && maxPrice !== '' && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : null;
  if (min == null && max == null) return null;
  const exprAnd = [];
  if (min != null) exprAnd.push({ $gte: [{ $ifNull: ['$salePrice', '$regularPrice'] }, min] });
  if (max != null) exprAnd.push({ $lte: [{ $ifNull: ['$salePrice', '$regularPrice'] }, max] });
  return CityPricing.distinct('product', {
    city: cityOid,
    isDeleted: false,
    isVisible: true,
    $expr: exprAnd.length === 1 ? exprAnd[0] : { $and: exprAnd },
  });
}

/**
 * City-scoped product id list for marketplace listing (sellable, OOS, price slice, etc.).
 * @param {Record<string, unknown>} query
 * @param {import('mongoose').Types.ObjectId} cityOid
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
async function computeCityScopedProductIdSubset(query, cityOid) {
  const { minPrice, maxPrice, availability } = query;
  const hasPrice =
    (minPrice !== undefined && minPrice !== '' && Number.isFinite(Number(minPrice))) ||
    (maxPrice !== undefined && maxPrice !== '' && Number.isFinite(Number(maxPrice)));

  const sellable = await marketplaceCity.getSellableProductIdsForCity(cityOid);
  const sellSet = new Set(sellable.map((id) => String(id)));

  let baseIds = sellable;
  if (availability === 'out_of_stock') {
    const priced = await CityPricing.distinct('product', { city: cityOid, isVisible: true, isDeleted: false });
    baseIds = priced.filter((id) => !sellSet.has(String(id)));
  } else if (availability === 'made_to_order' || availability === 'ready_to_dispatch') {
    baseIds = await CityPricing.distinct('product', { city: cityOid, isVisible: true, isDeleted: false });
  }

  if (hasPrice) {
    const priceMatched = await distinctProductsMatchingPriceRange(cityOid, minPrice, maxPrice);
    const ps = new Set((priceMatched || []).map((id) => String(id)));
    baseIds = baseIds.filter((id) => ps.has(String(id)));
  }

  return baseIds;
}

module.exports = {
  buildProductSearchOr,
  applyLegacyAndStructBayBadgeFilters,
  computeCityScopedProductIdSubset,
  narrowProductsByCategoryAttributeFilters,
  intersectIdLists,
  parseCommaList,
};
