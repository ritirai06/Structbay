const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const products = await Product.collection.find({ category: { $exists: true } }).toArray();
    
    let modified = 0;
    for (const product of products) {
        await Product.collection.updateOne(
            { _id: product._id },
            { 
                $set: { categories: [product.category] },
                $unset: { category: "" }
            }
        );
        modified++;
    }

    console.log(`Migration complete. Modified ${modified} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
