require('./helpers/env');

const request = require('supertest');
const app = require('../app');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./helpers/db');
const { generateAccessToken, buildTokenPayload } = require('../src/utils/tokenUtils');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Brand = require('../src/models/Brand');
const Product = require('../src/models/Product');
const ProductVariation = require('../src/models/ProductVariation');

async function seedAdminToken() {
  const admin = await User.create({
    name: 'Matrix Admin',
    email: 'matrix-admin@structbay.test',
    password: 'Password123!',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  return generateAccessToken(buildTokenPayload(admin));
}

async function seedVariantProduct(name, sku) {
  const category = await Category.create({ name: `${name} Category` });
  const brand = await Brand.create({ name: `${name} Brand`, category: category._id });
  return Product.create({
    name,
    sku,
    category: category._id,
    brand: brand._id,
    productStructure: 'variant',
    status: 'ACTIVE',
  });
}

async function generateMatrix(token, productId, axes) {
  return request(app)
    .post(`/api/v1/products/${productId}/variations/generate-matrix`)
    .set('Authorization', `Bearer ${token}`)
    .send({ axes });
}

beforeAll(connectTestDB);
afterAll(disconnectTestDB);
afterEach(clearCollections);

describe('product variation matrix generation', () => {
  test('generates 4 sizes x 4 colors = 16 apparel variants with color codes', async () => {
    const token = await seedAdminToken();
    const product = await seedVariantProduct('Matrix Shirt', 'MSHIRT');

    const res = await generateMatrix(token, product._id, [
      { key: 'Size', values: ['S', 'M', 'L', 'XL'] },
      {
        key: 'Color',
        values: [
          { value: 'Red', colorCode: '#FF0000' },
          { value: 'Blue', colorCode: '#0000FF' },
          { value: 'Green', colorCode: '#00FF00' },
          { value: 'Yellow', colorCode: '#FFFF00' },
        ],
      },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(16);
    expect(res.body.data.created).toHaveLength(16);

    const count = await ProductVariation.countDocuments({ product: product._id });
    expect(count).toBe(16);

    const redSmall = await ProductVariation.findOne({
      product: product._id,
      'attributes.size': 'S',
      'attributes.color': 'Red',
    }).lean();
    expect(redSmall.sku).toMatch(/^MSHIRT-/);
    expect(redSmall.attributes.custom).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'Color_code', value: '#FF0000' })])
    );
  });

  test('generates 3 diameters x 3 weights = 9 construction variants', async () => {
    const token = await seedAdminToken();
    const product = await seedVariantProduct('Matrix Rebar', 'MREBAR');

    const res = await generateMatrix(token, product._id, [
      { key: 'Diameter', values: ['10mm', '12mm', '16mm'] },
      { key: 'Weight', values: ['10KG', '20KG', '50KG'] },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(9);
    expect(await ProductVariation.countDocuments({ product: product._id })).toBe(9);
  });

  test('generates 2 colors x 3 sizes x 2 weights = 12 mixed variants', async () => {
    const token = await seedAdminToken();
    const product = await seedVariantProduct('Matrix Mixed', 'MMIXED');

    const res = await generateMatrix(token, product._id, [
      {
        key: 'Color',
        values: [
          { value: 'Red', colorCode: 'red' },
          { value: 'Blue', colorCode: 'rgb(0, 0, 255)' },
        ],
      },
      { key: 'Size', values: ['S', 'M', 'L'] },
      { key: 'Weight', values: ['10KG', '20KG'] },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(12);
    expect(await ProductVariation.countDocuments({ product: product._id })).toBe(12);
  });

  test('rejects invalid color codes before creating variants', async () => {
    const token = await seedAdminToken();
    const product = await seedVariantProduct('Matrix Invalid Color', 'MBADCOLOR');

    const res = await generateMatrix(token, product._id, [
      {
        key: 'Color',
        values: [{ value: 'Brand Red', colorCode: 'not-a-color' }],
      },
      { key: 'Size', values: ['S', 'M'] },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid color code/);
    expect(await ProductVariation.countDocuments({ product: product._id })).toBe(0);
  });
});
