const CityPricing = require('../models/CityPricing');
const ProductVariation = require('../models/ProductVariation');

const VARIATION_SELECT =
  'attributes sku images sortOrder mrp moq leadTimeDays vendorSku weightKg';

/**
 * Attach ACTIVE variations (+ optional city pricing) for storefront listing cards.
 */
async function enrichListingProducts(products, cityOid = null) {
  if (!products?.length) return [];

  return Promise.all(
    products.map(async (p) => {
      const json = typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
      const productId = json._id || p._id;

      const variations = await ProductVariation.find({ product: productId, status: 'ACTIVE' })
        .select(VARIATION_SELECT)
        .sort({ sortOrder: 1 })
        .lean();

      if (!cityOid) {
        return { ...json, pricing: json.pricing ?? null, variations, variationPricing: [] };
      }

      const [pricing, variationPricing] = await Promise.all([
        CityPricing.findOne({
          product: productId,
          city: cityOid,
          variation: null,
          isDeleted: false,
        })
          .select('regularPrice salePrice wholesaleSlabs')
          .lean(),
        CityPricing.find({
          product: productId,
          city: cityOid,
          variation: { $ne: null },
          isDeleted: false,
        })
          .select('variation regularPrice salePrice wholesaleSlabs')
          .lean(),
      ]);

      return { ...json, pricing, variations, variationPricing };
    })
  );
}

module.exports = { enrichListingProducts };
