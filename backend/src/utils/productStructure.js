const ProductVariation = require('../models/ProductVariation');

const VALID_PRODUCT_STRUCTURES = ['simple', 'variant'];

/** Synchronous read when productStructure is already on the document. */
function structureFromDoc(product) {
  const explicit = product?.productStructure;
  return VALID_PRODUCT_STRUCTURES.includes(explicit) ? explicit : null;
}

/** Resolve structure from document or legacy variation count. */
async function resolveProductStructure(product) {
  const explicit = structureFromDoc(product);
  if (explicit === 'variant') return 'variant';

  const productId = product?._id || product;
  if (productId) {
    const count = await ProductVariation.countDocuments({
      product: productId,
      status: 'ACTIVE',
      isDeleted: { $ne: true },
    });
    if (count > 0) return 'variant';
  }

  if (explicit === 'simple') return 'simple';
  return 'simple';
}

async function productRequiresVariation(productId) {
  const Product = require('../models/Product');
  const p = await Product.findById(productId).select('productStructure').lean();
  if (p?.productStructure === 'variant') return true;
  const count = await ProductVariation.countDocuments({
    product: productId,
    status: 'ACTIVE',
    isDeleted: { $ne: true },
  });
  if (count > 0) return true;
  return false;
}

module.exports = {
  VALID_PRODUCT_STRUCTURES,
  structureFromDoc,
  resolveProductStructure,
  productRequiresVariation,
};
