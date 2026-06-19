/**
 * Set productStructure='variant' on products that have active variations but are still marked simple.
 * Run: node scripts/sync-product-structure.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const ProductVariation = require('../src/models/ProductVariation');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri);

  const variantProductIds = await ProductVariation.distinct('product', {
    status: 'ACTIVE',
    isDeleted: { $ne: true },
  });

  if (!variantProductIds.length) {
    console.log('No active variations found.');
    await mongoose.disconnect();
    return;
  }

  const result = await Product.updateMany(
    {
      _id: { $in: variantProductIds },
      productStructure: { $ne: 'variant' },
    },
    { $set: { productStructure: 'variant' } }
  );

  console.log(
    `Updated ${result.modifiedCount} product(s) to productStructure=variant (${variantProductIds.length} have active variations).`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
