require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./src/models/Product');
  const Category = require('./src/models/Category');

  const catPaints = await Category.findOne({ slug: 'paints-and-more' });
  const catPlywood = await Category.findOne({ slug: 'plywood-more' });
  
  const product = await Product.findOne({ name: /Astral - PTFE Tape/i }).lean();
  
  if (product) {
    console.log('Product Found:', product.name);
    console.log('Product Categories:', product.categories);
    console.log('Product Status:', product.status);
    
    // Test the exact query used in customer.routes.js
    const match = await Product.findOne({
      _id: product._id,
      $or: [{ category: catPaints._id }, { categories: catPaints._id }]
    });
    console.log('Matches Paints category?', !!match);
    
  } else {
    console.log('Product not found');
  }
  
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
