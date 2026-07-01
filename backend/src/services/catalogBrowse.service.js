const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const CityPricing = require('../models/CityPricing');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const marketplaceCity = require('./marketplaceCity.service');
const { escRx } = require('../utils/resolveCategoryFromRow');
const {
  getAttributeValue,
  buildVariationAttributeValueMatch,
} = require('../utils/variationAttributes');
const { dedupeAttributeValues, canonicalAttributeValue } = require('../utils/attributeValueNormalize');

/** Expand filter values so "10 KG" matches stored "10kg" / "10 kg". */
function expandAttributeFilterValues(vals, key) {
  const out = new Set();
  for (const v of vals) {
    const raw = String(v).trim();
    if (!raw) continue;
    out.add(raw);
    const canon = canonicalAttributeValue(raw, key);
    out.add(canon);
    out.add(canon.toLowerCase());
    out.add(raw.toLowerCase());
    out.add(canon.replace(/\s+/g, ''));
    out.add(canon.replace(/\s+/g, '').toLowerCase());
  }
  return [...out];
}

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
/** @param {unknown} v */
function parseNumericBound(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v */
function parseNumericFromAttributeValue(v) {
  const m = String(v ?? '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Collect distinct attribute values from variations for facet / filter UI.
 * @param {import('mongoose').Types.ObjectId[]} productIds
 * @param {Array<{ key?: string }>} filterDefs
 */
async function distinctAttributeValuesForProducts(productIds, filterDefs) {
  const keys = new Set(
    (filterDefs || [])
      .filter((f) => f?.key && f.isActive !== false)
      .map((f) => String(f.key).toLowerCase())
  );
  
  if (!productIds?.length) return {};

  const products = await Product.find({ _id: { $in: productIds } }).select('attributes').lean();
  for (const product of products) {
    if (Array.isArray(product.attributes)) {
      for (const attr of product.attributes) {
        if (attr.showInFilters !== false && attr.name) {
          keys.add(String(attr.name).toLowerCase());
        }
      }
    }
  }

  if (!keys.size) return {};

  const variations = await ProductVariation.find({
    product: { $in: productIds },
    status: 'ACTIVE',
  })
    .select('attributes weightKg')
    .lean();

  /** @type {Record<string, Set<string>>} */
  const facets = {};
  for (const key of keys) facets[key] = new Set();

  for (const v of variations) {
    for (const key of keys) {
      if (key === 'weight' && v.weightKg != null && Number.isFinite(Number(v.weightKg))) {
        facets[key].add(canonicalAttributeValue(String(v.weightKg), 'weight'));
      }
      const val = getAttributeValue(v.attributes, key);
      if (val) facets[key].add(canonicalAttributeValue(val, key));
    }
  }

  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [key, set] of Object.entries(facets)) {
    out[key] = dedupeAttributeValues([...set], key);
  }
  return out;
}

/**
 * Merge admin-defined filter options with live variant values from the category.
 * @param {Array<object>} filterDefs
 * @param {Record<string, string[]>} facets
 */
function enrichCategoryFilterDefinitions(filterDefs, facets) {
  return (filterDefs || [])
    .filter((f) => f && f.key && f.isActive !== false)
    .map((f) => {
      const key = String(f.key).toLowerCase();
      const fromProducts = facets[key] || [];
      const adminOpts = (f.options || []).map((o) => {
        const value = canonicalAttributeValue(o.value ?? o.label ?? '', key);
        const label = String(o.label ?? o.value ?? value).trim();
        return value ? { label: label || value, value } : null;
      }).filter(Boolean);

      const seen = new Set();
      const mergedOpts = [];
      for (const o of adminOpts) {
        const canon = canonicalAttributeValue(o.value, key).toLowerCase();
        if (seen.has(canon)) continue;
        seen.add(canon);
        mergedOpts.push(o);
      }
      for (const val of fromProducts) {
        const canon = canonicalAttributeValue(val, key).toLowerCase();
        if (seen.has(canon)) continue;
        seen.add(canon);
        mergedOpts.push({ label: val, value: val });
      }

      return { ...f, key, options: mergedOpts };
    });
}

const DISCOVERABLE_ATTR_KEYS = ['color', 'weight', 'grade', 'size', 'finish', 'diameter'];

/**
 * Auto-add facet filters for common variant attributes not configured in admin.
 * @param {Array<object>} filterDefs
 * @param {Record<string, string[]>} facets
 */
function appendDiscoveredAttributeFilters(filterDefs, facets) {
  const existing = new Set((filterDefs || []).map((f) => String(f.key).toLowerCase()));
  const extra = [];
  let sortOrder = 50;
  for (const [key, opts] of Object.entries(facets)) {
    if (existing.has(key)) continue;
    if (!opts.length) continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    extra.push({
      label: key === 'weight' ? 'Weight / Pack' : label,
      key,
      type: 'MULTI_SELECT',
      options: opts.map((v) => ({ label: v, value: v })),
      sortOrder: sortOrder++,
      isActive: true,
      discovered: true,
    });
  }
  return [...(filterDefs || []), ...extra].sort(
    (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
  );
}

/**
 * Min/max listing unit price for products in a city (base + variation rows).
 * @param {import('mongoose').Types.ObjectId} cityOid
 * @param {import('mongoose').Types.ObjectId[]} productIds
 */
async function computeCategoryPriceBounds(cityOid, productIds) {
  if (!cityOid || !productIds?.length) return null;

  const rows = await CityPricing.find({
    city: cityOid,
    product: { $in: productIds },
    isDeleted: false,
    isVisible: true,
  })
    .select('regularPrice salePrice')
    .lean();

  let min = Infinity;
  let max = 0;
  for (const r of rows) {
    const p = Number(r.salePrice ?? r.regularPrice);
    if (!Number.isFinite(p) || p < 0) continue;
    min = Math.min(min, p);
    max = Math.max(max, p);
  }
  if (min === Infinity) return null;
  return { min: Math.floor(min), max: Math.ceil(max) };
}

/** @param {object} productJson enriched product with pricing */
function listingUnitPriceFromEnriched(productJson) {
  const isVariant = productJson?.productStructure === 'variant';

  if (!isVariant) {
    const pricing = productJson?.pricing;
    if (pricing) {
      const p = Number(pricing.salePrice ?? pricing.sellingPrice ?? pricing.regularPrice);
      if (Number.isFinite(p) && p >= 0) return p;
    }
    return 0;
  }

  const priceFromRow = (row) => {
    if (!row) return null;
    const p = Number(row.salePrice ?? row.sellingPrice ?? row.regularPrice);
    return Number.isFinite(p) && p >= 0 ? p : null;
  };

  const vps = productJson?.variationPricing || [];
  const prices = vps.map(priceFromRow).filter((n) => n != null);
  if (!prices.length && Array.isArray(productJson?.variations)) {
    for (const v of productJson.variations) {
      const p = priceFromRow(v.pricing);
      if (p != null) prices.push(p);
    }
  }
  if (prices.length) return Math.min(...prices);
  return 0;
}

async function narrowProductsByCategoryAttributeFilters(categoryId, query, categoryFilterDoc) {
  const defs = (categoryFilterDoc?.filters || []).filter((f) => f && f.key && f.isActive !== false);
  const defByKey = new Map(defs.map((d) => [String(d.key).toLowerCase(), d]));

  const activeKeys = new Set(defs.map((d) => String(d.key).toLowerCase()));
  // Support any attribute filter from query: attr_<key> or <key>
  for (const key of Object.keys(query)) {
    const m = /^attr_(.+)$/.exec(key);
    if (m && query[key] !== undefined && query[key] !== '') activeKeys.add(m[1].toLowerCase());
    const minM = /^(.+)_min$/.exec(key);
    if (minM && query[key] !== undefined && query[key] !== '') activeKeys.add(minM[1].toLowerCase());
    const maxM = /^(.+)_max$/.exec(key);
    if (maxM && query[key] !== undefined && query[key] !== '') activeKeys.add(maxM[1].toLowerCase());
    // Also allow bare key names that exist in the admin filter defs
    if (defByKey.has(key.toLowerCase()) && query[key] !== undefined && query[key] !== '') {
      activeKeys.add(key.toLowerCase());
    }
  }

  if (!activeKeys.size) return null;

  const andParts = [];

  for (const key of activeKeys) {
    const minBound = parseNumericBound(query[`${key}_min`]);
    const maxBound = parseNumericBound(query[`${key}_max`]);
    const def = defByKey.get(key);
    const isRangeType = def?.type === 'RANGE' || minBound != null || maxBound != null;

    if (isRangeType && (minBound != null || maxBound != null)) {
      if (key === 'weight') {
        const weightKgParts = [];
        if (minBound != null) weightKgParts.push({ weightKg: { $gte: minBound } });
        if (maxBound != null) weightKgParts.push({ weightKg: { $lte: maxBound } });
        if (weightKgParts.length) andParts.push(...weightKgParts);
      } else if (FIXED_ATTR_KEYS.has(key)) {
        andParts.push({
          $expr: {
            $let: {
              vars: {
                n: {
                  $convert: {
                    input: { $trim: { input: { $ifNull: [`$attributes.${key}`, ''] } } },
                    to: 'double',
                    onError: null,
                    onNull: null,
                  },
                },
              },
              in: {
                $and: [
                  { $ne: ['$$n', null] },
                  ...(minBound != null ? [{ $gte: ['$$n', minBound] }] : []),
                  ...(maxBound != null ? [{ $lte: ['$$n', maxBound] }] : []),
                ],
              },
            },
          },
        });
      }
      continue;
    }

    const raw = query[key] !== undefined && query[key] !== '' ? query[key] : query[`attr_${key}`];
    const vals = expandAttributeFilterValues(parseCommaList(raw), key);
    if (!vals.length) continue;

    if (key === 'weight' && vals.length) {
      const numVals = vals.map(Number).filter(Number.isFinite);
      andParts.push({
        $or: [
          buildVariationAttributeValueMatch(key, vals),
          ...(numVals.length
            ? [{ weightKg: numVals.length === 1 ? numVals[0] : { $in: numVals } }]
            : []),
        ],
      });
      continue;
    }

    andParts.push(buildVariationAttributeValueMatch(key, vals));
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
 * When attribute filters narrow to variant-matched parents, keep simple products visible too.
 * @param {import('mongoose').Types.ObjectId|string} categoryId
 * @param {unknown[]|null} variantMatchedProductIds
 */
async function unionSimpleProductsForCategory(categoryId, variantMatchedProductIds) {
  if (variantMatchedProductIds === null) return null;
  const catOid = mongoose.Types.ObjectId.isValid(String(categoryId))
    ? new mongoose.Types.ObjectId(String(categoryId))
    : null;
  if (!catOid) return variantMatchedProductIds;

  const simpleIds = await Product.find({
    category: catOid,
    status: 'ACTIVE',
    $or: [{ productStructure: 'simple' }, { productStructure: { $exists: false } }],
  }).distinct('_id');

  const merged = new Set(variantMatchedProductIds.map((id) => String(id)));
  for (const id of simpleIds) merged.add(String(id));
  return [...merged];
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

function parsePriceBound(v, { min = false } = {}) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (min && n <= 0) return null;
  if (!min && n < 0) return null;
  return n;
}

async function distinctProductsMatchingPriceRange(cityOid, minPrice, maxPrice) {
  const min = parsePriceBound(minPrice, { min: true });
  const max = parsePriceBound(maxPrice, { min: false });
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
  const min = parsePriceBound(minPrice, { min: true });
  const max = parsePriceBound(maxPrice, { min: false });
  const hasPrice = min != null || max != null;

  const [priced, sellable] = await Promise.all([
    marketplaceCity.getPricedProductIdsForCity(cityOid),
    marketplaceCity.getSellableProductIdsForCity(cityOid),
  ]);
  const sellSet = new Set(sellable.map((id) => String(id)));

  // Default: list all city-priced products (in stock + out of stock). Checkout still requires sellable stock.
  let baseIds = priced;
  if (availability === 'in_stock') {
    baseIds = sellable;
  } else if (availability === 'out_of_stock') {
    baseIds = priced.filter((id) => !sellSet.has(String(id)));
  } else if (availability === 'made_to_order' || availability === 'ready_to_dispatch') {
    baseIds = priced;
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
  unionSimpleProductsForCategory,
  intersectIdLists,
  parseCommaList,
  distinctAttributeValuesForProducts,
  enrichCategoryFilterDefinitions,
  appendDiscoveredAttributeFilters,
  computeCategoryPriceBounds,
  listingUnitPriceFromEnriched,
  parseNumericFromAttributeValue,
};
