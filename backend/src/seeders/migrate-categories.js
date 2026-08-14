require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./src/models/Product');
  const products = await Product.find({ category: { $ne: null } }).lean();
  let updated = 0;
  for (const p of products) {
    if (!p.categories || p.categories.length === 0) {
      await Product.updateOne({ _id: p._id }, { $set: { categories: [p.category] } });
      updated++;
    }
  }
  console.log(`Migrated ${updated} products`);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
