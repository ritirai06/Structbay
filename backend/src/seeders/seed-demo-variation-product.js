/**
 * Demo product with full variation dropdowns (Coil Size / Thickness / Colour).
 *
 * Run: npm run seed:demo-product
 *
 * Creates or refreshes:
 * - Product SKU DEMO-WIRE-VAR (slug: demo-polycab-wire-variations)
 * - 6 ACTIVE variations (size × thickness × colour)
 * - Category filters (size, thickness, color)
 * - City pricing + inventory for every ACTIVE serviceable city
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const slugify = require('slugify');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const City = require('../models/City');
const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');
const CategoryFilter = require('../models/CategoryFilter');

const DEMO_SKU = 'DEMO-WIRE-VAR';
const DEMO_SLUG = 'demo-polycab-wire-variations';

const VARIATION_ROWS = [
  { size: '90 Meters', thickness: '1 Sqmm', color: 'Red', sale: 2074, mrp: 3770, sku: 'DEMO-WIRE-90-1-RED' },
  { size: '90 Meters', thickness: '1 Sqmm', color: 'Blue', sale: 2090, mrp: 3790, sku: 'DEMO-WIRE-90-1-BLU' },
  { size: '90 Meters', thickness: '1.5 Sqmm', color: 'Red', sale: 2450, mrp: 4200, sku: 'DEMO-WIRE-90-15-RED' },
  { size: '90 Meters', thickness: '1.5 Sqmm', color: 'Blue', sale: 2480, mrp: 4250, sku: 'DEMO-WIRE-90-15-BLU' },
  { size: '180 Meters', thickness: '1 Sqmm', color: 'Red', sale: 3890, mrp: 6200, sku: 'DEMO-WIRE-180-1-RED' },
  { size: '180 Meters', thickness: '1.5 Sqmm', color: 'Blue', sale: 4120, mrp: 6500, sku: 'DEMO-WIRE-180-15-BLU' },
];

const CATEGORY_FILTER_DEFS = [
  { label: 'Coil Size', key: 'size', type: 'MULTI_SELECT', sortOrder: 0 },
  { label: 'Wire Thickness', key: 'thickness', type: 'MULTI_SELECT', sortOrder: 1 },
  { label: 'Colour', key: 'color', type: 'MULTI_SELECT', sortOrder: 2 },
];

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80';

async function upsertCategoryFilters(categoryId) {
  let doc = await CategoryFilter.findOne({ category: categoryId });
  if (!doc) {
    doc = await CategoryFilter.create({ category: categoryId, filters: CATEGORY_FILTER_DEFS });
    return doc;
  }
  doc.filters = CATEGORY_FILTER_DEFS;
  await doc.save();
  return doc;
}

async function upsertPricingAndStock({ productId, variationId, cityId, regularPrice, salePrice }) {
  await CityPricing.findOneAndUpdate(
    { product: productId, variation: variationId, city: cityId },
    {
      product: productId,
      variation: variationId,
      city: cityId,
      regularPrice,
      salePrice,
      isVisible: true,
      isDeleted: false,
      wholesaleSlabs: [
        { minQty: 10, maxQty: 49, price: Math.round(salePrice * 0.97) },
        { minQty: 50, maxQty: null, price: Math.round(salePrice * 0.94) },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Inventory.findOneAndUpdate(
    { product: productId, variation: variationId, city: cityId },
    {
      product: productId,
      variation: variationId,
      city: cityId,
      quantity: 500,
      reserved: 0,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  await connectDB();

  const category =
    (await Category.findOne({ slug: /wire|electrical|cable/i, status: 'ACTIVE' })) ||
    (await Category.findOne({ status: 'ACTIVE' }).sort({ sortOrder: 1 }));
  const brand =
    (await Brand.findOne({ name: /polycab|wire/i, status: 'ACTIVE' })) ||
    (await Brand.findOne({ status: 'ACTIVE' }).sort({ sortOrder: 1 }));
  const cities = await City.find({ status: 'ACTIVE', isServiceable: true }).select('_id name').lean();

  if (!category) {
    console.error('No ACTIVE category found. Create a category in admin first.');
    process.exit(1);
  }
  if (!brand) {
    console.error('No ACTIVE brand found. Create a brand in admin first.');
    process.exit(1);
  }
  if (!cities.length) {
    console.error('No serviceable cities found. Add a city in admin first.');
    process.exit(1);
  }

  let product = await Product.findOne({ sku: DEMO_SKU });
  if (!product) {
    product = await Product.findOne({ slug: DEMO_SLUG });
  }

  const productPayload = {
    name: 'Polycab Maxima+ Green Wire HR FR-LSH LF (Demo Showcase)',
    slug: DEMO_SLUG,
    sku: DEMO_SKU,
    category: category._id,
    brand: brand._id,
    shortDescription:
      'Demo listing product — shows Coil Size, Wire Thickness and Colour dropdowns on shop/category pages.',
    description:
      'StructBay demo SKU for variation selectors. Use this product to verify storefront dropdowns before going live with real wire SKUs.',
    images: [{ url: PLACEHOLDER_IMAGE }],
    gstPercentage: 18,
    priceIncludesGst: false,
    status: 'ACTIVE',
    isFeatured: true,
    isTopSelling: true,
    isAssured: true,
    isStructbayAssured: true,
    isExpress: true,
    displayOrder: 0,
  };

  if (product) {
    Object.assign(product, productPayload);
    await product.save();
    console.log(`✓ Updated demo product: ${product.name}`);
  } else {
    product = await Product.create(productPayload);
    console.log(`✓ Created demo product: ${product.name}`);
  }

  await upsertCategoryFilters(category._id);
  console.log(`✓ Category filters set on "${category.name}" (size, thickness, color)`);

  // Fresh variations each run (demo SKU)
  await ProductVariation.deleteMany({ product: product._id });

  const variations = [];
  for (let i = 0; i < VARIATION_ROWS.length; i += 1) {
    const row = VARIATION_ROWS[i];
    const variation = await ProductVariation.create({
      product: product._id,
      attributes: {
        size: row.size,
        thickness: row.thickness,
        color: row.color,
        grade: 'FR-LSH',
        finish: 'Green Wire',
      },
      sku: row.sku,
      status: 'ACTIVE',
      sortOrder: i,
      mrp: row.mrp,
      moq: 1,
    });
    variations.push(variation);
  }
  console.log(`✓ ${variations.length} variations (size × thickness × colour)`);

  for (const city of cities) {
    for (const [i, variation] of variations.entries()) {
      const row = VARIATION_ROWS[i];
      await upsertPricingAndStock({
        productId: product._id,
        variationId: variation._id,
        cityId: city._id,
        regularPrice: row.mrp,
        salePrice: row.sale,
      });
    }
    console.log(`✓ Pricing + stock for city: ${city.name}`);
  }

  const storefrontPath = `/products/${product.slug}`;
  console.log('\n── Demo product ready ──');
  console.log(`SKU:     ${DEMO_SKU}`);
  console.log(`Slug:    ${product.slug}`);
  console.log(`Category: ${category.name}`);
  console.log(`Open:    ${storefrontPath}`);
  console.log(`Or shop: /shop  /category/${category.slug}`);
  console.log('Select your city on the storefront, then look for this product.\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
