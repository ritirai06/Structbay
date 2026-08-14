const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/structbay');
  const products = await Product.find({}).lean();
  console.log(`Total products: ${products.length}`);
  const activeProducts = products.filter(p => p.status === 'ACTIVE');
  console.log(`Active products: ${activeProducts.length}`);
  if (activeProducts.length > 0) {
    console.log("Sample product:");
    console.log(activeProducts[0]);
  }
  process.exit(0);
}

run();
