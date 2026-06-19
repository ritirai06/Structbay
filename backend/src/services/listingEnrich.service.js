const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');
const ProductVariation = require('../models/ProductVariation');
const { resolveProductStructure } = require('../utils/productStructure');
const { normalizeVariationAttributes } = require('../utils/variationAttributes');
const { canonicalAttributeValue } = require('../utils/attributeValueNormalize');

const VARIATION_SELECT =
  'attributes sku images sortOrder mrp moq leadTimeDays vendorSku weightKg';

function variationAttributeSignature(attrs) {
  const map = normalizeVariationAttributes({ attributes: attrs });
  return Object.keys(map)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k.toLowerCase()}:${canonicalAttributeValue(map[k], k).toLowerCase()}`)
    .join('|');
}

/**
 * Collapse legacy duplicate variants (e.g. size "10kg" vs "10 KG") for storefront display.
 * @param {Array<object>} variations
 * @param {Map<string, object>} priceByVar
 */
function dedupeVariationsByAttributes(variations, priceByVar) {
  const seen = new Map();
  for (const v of variations) {
    const sig = variationAttributeSignature(v.attributes);
    if (!sig) {
      seen.set(String(v._id), v);
      continue;
    }
    const existing = seen.get(sig);
    if (!existing) {
      seen.set(sig, v);
      continue;
    }
    const vid = variationIdString(v._id);
    const existingId = variationIdString(existing._id);
    const hasPrice = priceByVar.has(vid);
    const existingHasPrice = priceByVar.has(existingId);
    if (hasPrice && !existingHasPrice) seen.set(sig, v);
  }
  return [...seen.values()];
}

function stockStatusFromQuantity(qty, threshold = 50) {
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/** @param {unknown} variationRef */
function variationIdString(variationRef) {
  if (!variationRef) return '';
  if (typeof variationRef === 'string') return variationRef;
  if (typeof variationRef === 'object' && variationRef !== null) {
    if ('_id' in variationRef && variationRef._id) return String(variationRef._id);
    if (typeof variationRef.toString === 'function') {
      const s = variationRef.toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  return String(variationRef);
}

/**
 * Normalize pricing rows for API consumers (string variation ids + sellingPrice alias).
 * @param {Array<object>} rows
 */
function serializePricingRows(rows) {
  return (rows || []).map((row) => ({
    ...row,
    variation: row.variation ? variationIdString(row.variation) : null,
    sellingPrice: row.salePrice ?? row.regularPrice,
  }));
}

/**
 * If variant rows are missing but legacy base pricing exists, copy base price to each variant.
 * @param {Array<object>} variations
 * @param {Array<object>} perVariationRows
 * @param {object|null} baseRow
 */
function resolveVariationPricingRows(variations, perVariationRows, baseRow) {
  const serialized = serializePricingRows(perVariationRows);
  if (serialized.length || !baseRow || !variations?.length) return serialized;

  return variations.map((v) => ({
    ...baseRow,
    variation: variationIdString(v._id),
    sellingPrice: baseRow.salePrice ?? baseRow.regularPrice,
  }));
}

/**
 * Attach ACTIVE variations (+ optional city pricing/inventory) for storefront listing cards.
 */
async function enrichListingProducts(products, cityOid = null) {
  if (!products?.length) return [];

  return Promise.all(
    products.map(async (p) => {
      const json = typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
      const productId = json._id || p._id;
      const structure = await resolveProductStructure(json);
      const isVariantProduct = structure === 'variant';

      const variations = isVariantProduct
        ? await ProductVariation.find({ product: productId, status: 'ACTIVE' })
          .select(VARIATION_SELECT)
          .sort({ sortOrder: 1 })
          .lean()
        : [];

      if (!cityOid) {
        return {
          ...json,
          productStructure: structure,
          pricing: isVariantProduct ? null : (json.pricing ?? null),
          variations: isVariantProduct ? variations : [],
          variationPricing: [],
        };
      }

      const [pricing, allCityPricing, baseInventory, variationInventory] = await Promise.all([
        isVariantProduct
          ? null
          : CityPricing.findOne({
            product: productId,
            city: cityOid,
            variation: null,
            isDeleted: false,
            isVisible: true,
          })
            .select('regularPrice salePrice wholesaleSlabs mrp')
            .lean(),
        isVariantProduct
          ? CityPricing.find({
            product: productId,
            city: cityOid,
            isDeleted: false,
            isVisible: true,
          })
            .select('variation regularPrice salePrice wholesaleSlabs mrp')
            .lean()
          : [],
        isVariantProduct
          ? null
          : Inventory.findOne({
            product: productId,
            city: cityOid,
            variation: null,
            isDeleted: false,
          })
            .select('quantity reserved lowStockThreshold')
            .lean(),
        isVariantProduct
          ? Inventory.find({
            product: productId,
            city: cityOid,
            variation: { $ne: null },
            isDeleted: false,
          })
            .select('variation quantity reserved lowStockThreshold')
            .lean()
          : [],
      ]);

      const perVariationPricing = (allCityPricing || []).filter((row) => row.variation != null);
      const basePricingRow = (allCityPricing || []).find((row) => !row.variation) || null;
      const variationPricing = isVariantProduct
        ? resolveVariationPricingRows(variations, perVariationPricing, basePricingRow)
        : [];

      const priceByVar = new Map(
        variationPricing.map((row) => [variationIdString(row.variation), row])
      );

      const uniqueVariations = isVariantProduct
        ? dedupeVariationsByAttributes(variations, priceByVar)
        : variations;

      const invByVar = new Map(
        (variationInventory || []).map((row) => [variationIdString(row.variation), row])
      );

      const enrichedVariations = uniqueVariations.map((v) => {
        const vid = variationIdString(v._id);
        const inv = invByVar.get(vid);
        const available = inv ? Math.max(0, inv.quantity - (inv.reserved || 0)) : 0;
        const threshold = inv?.lowStockThreshold ?? 50;
        const priceRow = priceByVar.get(vid) || null;
        return {
          ...v,
          pricing: priceRow,
          availableStock: available,
          inStock: available > 0,
          stockStatus: stockStatusFromQuantity(available, threshold),
        };
      });

      let inStock = false;
      let availableStock = 0;
      if (isVariantProduct) {
        inStock = enrichedVariations.some((v) => v.inStock);
        availableStock = enrichedVariations.reduce((sum, v) => sum + (v.availableStock || 0), 0);
      } else if (baseInventory) {
        availableStock = Math.max(0, baseInventory.quantity - (baseInventory.reserved || 0));
        inStock = availableStock > 0;
      }

      const simplePricing = pricing
        ? { ...pricing, sellingPrice: pricing.salePrice ?? pricing.regularPrice }
        : null;

      const variationPricingOut = isVariantProduct
        ? variationPricing.filter((row) =>
          uniqueVariations.some((v) => variationIdString(v._id) === variationIdString(row.variation))
        )
        : [];

      return {
        ...json,
        productStructure: structure,
        pricing: simplePricing,
        variations: isVariantProduct ? enrichedVariations : [],
        variationPricing: variationPricingOut,
        inStock,
        availableStock,
        stockStatus: isVariantProduct
          ? (inStock ? 'IN_STOCK' : 'OUT_OF_STOCK')
          : stockStatusFromQuantity(
            availableStock,
            baseInventory?.lowStockThreshold ?? 50
          ),
      };
    })
  );
}

module.exports = { enrichListingProducts, variationIdString };
