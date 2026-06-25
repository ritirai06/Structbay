const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const ProductRelationship = require('../models/ProductRelationship');
const Product = require('../models/Product');

// ─── Get relationships for a product ─────────────────────────────────────────
const getRelationships = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found.', 404);

  const [upsellRels, crossSellRels] = await Promise.all([
    ProductRelationship.find({ product: id, relationshipType: 'UPSSELL' })
      .populate({
        path: 'relatedProduct',
        select: '_id name sku slug images category brand status sellingPrice mrp cityPricing variants defaultVariant discount pricing priceIncludesGst',
        populate: {
          path: 'variants',
          select: '_id name sku images sellingPrice mrp cityPricing discount pricing priceIncludesGst'
        }
      })
      .lean(),
    ProductRelationship.find({ product: id, relationshipType: 'CROSS_SELL' })
      .populate({
        path: 'relatedProduct',
        select: '_id name sku slug images category brand status sellingPrice mrp cityPricing variants defaultVariant discount pricing priceIncludesGst',
        populate: {
          path: 'variants',
          select: '_id name sku images sellingPrice mrp cityPricing discount pricing priceIncludesGst'
        }
      })
      .lean()
  ]);

  const upsells = upsellRels
    .filter(r => r.relatedProduct && r.relatedProduct.status === 'ACTIVE')
    .map(r => r.relatedProduct);
  
  const crossSells = crossSellRels
    .filter(r => r.relatedProduct && r.relatedProduct.status === 'ACTIVE')
    .map(r => r.relatedProduct);

  return ApiResponse.success(res, 200, 'Relationships retrieved.', {
    productId: id,
    upsells,
    crossSells
  });
});

// ─── Save relationships for a product ────────────────────────────────────────
const saveRelationships = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { upsells = [], cross_sells = [] } = req.body;

  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found.', 404);

  // Validate that all related product IDs exist and are not the same as the main product
  const allRelatedIds = [...upsells, ...cross_sells];
  
  if (allRelatedIds.some(pid => pid === id)) {
    throw new AppError('Cannot create relationship with the same product.', 400);
  }

  const validProducts = await Product.find({ 
    _id: { $in: allRelatedIds },
    isDeleted: { $ne: true }
  }).select('_id status');

  const validIds = new Set(validProducts.map(p => p._id.toString()));
  const activeIds = new Set(
    validProducts.filter(p => p.status === 'ACTIVE').map(p => p._id.toString())
  );

  // Validate all provided IDs exist
  for (const pid of allRelatedIds) {
    if (!validIds.has(pid)) {
      throw new AppError(`Product with ID ${pid} not found.`, 404);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Delete existing relationships for this product
    await ProductRelationship.deleteMany({ product: id }, { session });

    // Create new relationships
    const relationships = [];

    // Only create relationships for active products
    for (const upsellId of upsells) {
      if (activeIds.has(upsellId)) {
        relationships.push({
          product: id,
          relatedProduct: upsellId,
          relationshipType: 'UPSSELL'
        });
      }
    }

    for (const crossSellId of cross_sells) {
      if (activeIds.has(crossSellId)) {
        relationships.push({
          product: id,
          relatedProduct: crossSellId,
          relationshipType: 'CROSS_SELL'
        });
      }
    }

    if (relationships.length > 0) {
      await ProductRelationship.insertMany(relationships, { session });
    }

    await session.commitTransaction();

    // Return updated relationships
    const [updatedUpsellRels, updatedCrossSellRels] = await Promise.all([
      ProductRelationship.find({ product: id, relationshipType: 'UPSSELL' })
        .populate({
          path: 'relatedProduct',
          select: '_id name sku slug images category brand status'
        })
        .lean(),
      ProductRelationship.find({ product: id, relationshipType: 'CROSS_SELL' })
        .populate({
          path: 'relatedProduct',
          select: '_id name sku slug images category brand status'
        })
        .lean()
    ]);

    const updatedUpsells = updatedUpsellRels
      .filter(r => r.relatedProduct && r.relatedProduct.status === 'ACTIVE')
      .map(r => r.relatedProduct);
    
    const updatedCrossSells = updatedCrossSellRels
      .filter(r => r.relatedProduct && r.relatedProduct.status === 'ACTIVE')
      .map(r => r.relatedProduct);

    return ApiResponse.success(res, 200, 'Relationships saved successfully.', {
      productId: id,
      upsells: updatedUpsells,
      crossSells: updatedCrossSells
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

// ─── Get upsell products for cart (used by cart API) ────────────────────────
const getUpsellProducts = asyncHandler(async (req, res) => {
  const { productIds } = req.query;
  
  if (!productIds) {
    return ApiResponse.success(res, 200, 'No products provided.', []);
  }

  const ids = Array.isArray(productIds) 
    ? productIds 
    : String(productIds).split(',').map(id => id.trim()).filter(Boolean);

  if (ids.length === 0) {
    return ApiResponse.success(res, 200, 'No products provided.', []);
  }

   // Find upsell relationships for the given products, preserving admin order
   const relationships = await ProductRelationship.find({
     product: { $in: ids },
     relationshipType: 'UPSSELL'
   })
     .sort({ product: 1, _id: 1 }) // preserve insertion order per product
     .populate({
       path: 'relatedProduct',
       match: { status: 'ACTIVE', isDeleted: { $ne: true } },
       select: '_id name sku slug images category brand gstPercentage status unit priceIncludesGst pricing variationPricing'
     })
     .lean();

   // Collect upsell product IDs in admin-defined order, skipping nulls and deduplicating while preserving order
   const seen = new Set();
   const upsellProductIds = [];
   for (const rel of relationships) {
     if (rel.relatedProduct && !seen.has(rel.relatedProduct._id.toString())) {
       seen.add(rel.relatedProduct._id.toString());
       upsellProductIds.push(rel.relatedProduct._id.toString());
     }
   }

   // Get full product details for the upsell products, preserving order
   const productsRaw = await Product.find({ 
     _id: { $in: upsellProductIds },
     status: 'ACTIVE',
     isDeleted: { $ne: true }
   })
     .populate('category', 'name slug')
     .populate('brand', 'name slug logo')
     .lean();

   // Map for fast lookup and return in admin order
   const productsMap = {};
   for (const p of productsRaw) {
     productsMap[p._id.toString()] = p;
   }
   const products = upsellProductIds
     .map(id => productsMap[id])
     .filter(Boolean)
     .slice(0, 8);

   return ApiResponse.success(res, 200, 'Upsell products retrieved.', products);
});

// ─── Get cross-sell products for product detail page ────────────────────────
const getCrossSellProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const relationships = await ProductRelationship.find({
    product: productId,
    relationshipType: 'CROSS_SELL'
  }).populate({
    path: 'relatedProduct',
    match: { status: 'ACTIVE', isDeleted: { $ne: true } },
    select: '_id name sku slug images category brand gstPercentage status unit priceIncludesGst pricing variationPricing productStructure'
  }).lean();

  // Filter out null relatedProducts
  const crossSellProductIds = relationships
    .filter(r => r.relatedProduct != null)
    .map(r => r.relatedProduct._id.toString());

  // Fetch full enriched product data with category/brand populated
  const crossSellProducts = await Product.find({
    _id: { $in: crossSellProductIds },
    status: 'ACTIVE',
    isDeleted: { $ne: true }
  })
  .populate('category', 'name slug')
  .populate('brand', 'name slug logo')
  .lean();

  return ApiResponse.success(res, 200, 'Cross-sell products retrieved.', crossSellProducts);
});

// ─── Remove a specific relationship ──────────────────────────────────────────
const removeRelationship = asyncHandler(async (req, res) => {
  const { id, relatedId, type } = req.params;

  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found.', 404);

  const relatedProduct = await Product.findById(relatedId);
  if (!relatedProduct) throw new AppError('Related product not found.', 404);

  const result = await ProductRelationship.deleteOne({
    product: id,
    relatedProduct: relatedId,
    relationshipType: type.toUpperCase()
  });

  if (result.deletedCount === 0) {
    throw new AppError('Relationship not found.', 404);
  }

  return ApiResponse.success(res, 200, 'Relationship removed.');
});

module.exports = {
  getRelationships,
  saveRelationships,
  getUpsellProducts,
  getCrossSellProducts,
  removeRelationship
};