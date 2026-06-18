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
  FIXED_ATTR_KEYS.forEach((k) => keys.add(k));

  if (!productIds?.length || !keys.size) return {};

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
    const attrs = v.attributes || {};
    for (const key of keys) {
      if (FIXED_ATTR_KEYS.has(key)) {
        if (key === 'weight' && v.weightKg != null && Number.isFinite(Number(v.weightKg))) {
          facets[key].add(String(v.weightKg));
        }
        const val = attrs[key];
        if (val != null && String(val).trim()) facets[key].add(String(val).trim());
      } else if (Array.isArray(attrs.custom)) {
        for (const c of attrs.custom) {
          if (c?.key && String(c.key).toLowerCase() === key && c.value) {
            facets[key].add(String(c.value).trim());
          }
        }
      }
    }
  }

  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [key, set] of Object.entries(facets)) {
    out[key] = [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
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
        const value = String(o.value ?? o.label ?? '').trim();
        const label = String(o.label ?? o.value ?? value).trim();
        return value ? { label: label || value, value } : null;
      }).filter(Boolean);

      const seen = new Set(adminOpts.map((o) => o.value));
      for (const val of fromProducts) {
        if (!seen.has(val)) {
          adminOpts.push({ label: val, value: val });
          seen.add(val);
        }
      }

      return { ...f, key, options: adminOpts };
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
  for (const key of DISCOVERABLE_ATTR_KEYS) {
    if (existing.has(key)) continue;
    const opts = facets[key] || [];
    if (!opts.length) continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    extra.push({
      label: key === 'weight' ? 'Weight / Pack' : label,
      key,
      type: 'MULTI_SELECT',
      options: opts.map((v) => ({ label: v, value: v })),
      sortOrder: 50 + DISCOVERABLE_ATTR_KEYS.indexOf(key),
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
  const pricing = productJson?.pricing;
  if (pricing) {
    const p = Number(pricing.salePrice ?? pricing.regularPrice);
    if (Number.isFinite(p) && p >= 0) return p;
  }
  const vps = productJson?.variationPricing || [];
  const prices = vps
    .map((row) => Number(row?.salePrice ?? row?.regularPrice))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (prices.length) return Math.min(...prices);
  return 0;
}

async function narrowProductsByCategoryAttributeFilters(categoryId, query, categoryFilterDoc) {
  const defs = (categoryFilterDoc?.filters || []).filter((f) => f && f.key && f.isActive !== false);
  const defByKey = new Map(defs.map((d) => [String(d.key).toLowerCase(), d]));

  const activeKeys = new Set(defs.map((d) => String(d.key).toLowerCase()));
  for (const key of FIXED_ATTR_KEYS) {
    const raw = query[key] ?? query[`attr_${key}`];
    const minRaw = query[`${key}_min`];
    const maxRaw = query[`${key}_max`];
    if (raw || minRaw != null && minRaw !== '' || maxRaw != null && maxRaw !== '') {
      activeKeys.add(key);
    }
  }
  for (const key of Object.keys(query)) {
    const m = /^(.+)_min$/.exec(key);
    if (m && query[key] !== undefined && query[key] !== '') activeKeys.add(m[1].toLowerCase());
    const mx = /^(.+)_max$/.exec(key);
    if (mx && query[key] !== undefined && query[key] !== '') activeKeys.add(mx[1].toLowerCase());
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
  distinctAttributeValuesForProducts,
  enrichCategoryFilterDefinitions,
  appendDiscoveredAttributeFilters,
  computeCategoryPriceBounds,
  listingUnitPriceFromEnriched,
  parseNumericFromAttributeValue,
};
