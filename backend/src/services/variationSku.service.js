const AppError = require('../utils/AppError');
const ProductVariation = require('../models/ProductVariation');
const { flattenVariationAttributes } = require('../utils/variationAttributes');

function slugSkuPart(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 24);
}

async function skuExistsForProduct(productId, sku, excludeVariationId = null) {
  if (!sku) return false;
  const filter = {
    product: productId,
    sku: String(sku).trim().toUpperCase(),
    isDeleted: { $ne: true },
  };
  if (excludeVariationId) filter._id = { $ne: excludeVariationId };
  const hit = await ProductVariation.findOne(filter).select('_id').lean();
  return !!hit;
}

async function generateVariantSku(product, attributes, excludeVariationId = null) {
  const parent = String(product.sku || 'VAR').trim().toUpperCase();
  const rows = flattenVariationAttributes(attributes)
    .sort((a, b) => a.key.localeCompare(b.key));
  const parts = rows.map((r) => slugSkuPart(r.value)).filter(Boolean);
  let base = parts.length
    ? `${parent}-${parts.join('-')}`
    : `${parent}-V${Date.now().toString(36).toUpperCase().slice(-5)}`;
  base = base.slice(0, 80);

  let candidate = base;
  let n = 2;
  while (await skuExistsForProduct(product._id, candidate, excludeVariationId)) {
    candidate = `${base.slice(0, 72)}-${n}`;
    n += 1;
  }
  return candidate;
}

async function resolveVariantSku({ product, requestedSku, attributes, variationId = null }) {
  const parentSku = String(product.sku || '').trim().toUpperCase();
  let sku = requestedSku != null && String(requestedSku).trim()
    ? String(requestedSku).trim().toUpperCase()
    : '';

  if (!sku) {
    return generateVariantSku(product, attributes, variationId);
  }

  if (sku === parentSku) {
    return generateVariantSku(product, attributes, variationId);
  }

  if (await skuExistsForProduct(product._id, sku, variationId)) {
    throw new AppError(`SKU "${sku}" already exists on this product. Use a different SKU or leave blank to auto-generate.`, 409);
  }

  return sku;
}

module.exports = {
  resolveVariantSku,
  generateVariantSku,
  skuExistsForProduct,
};
