const router = require('express').Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole }           = require('../middleware/role.middleware');
const asyncHandler              = require('../utils/asyncHandler');
const ApiResponse               = require('../utils/apiResponse');
const User                      = require('../models/User');

const cartCtrl      = require('../controllers/cart.controller');
const addressCtrl   = require('../controllers/address.controller');
const checkoutCtrl  = require('../controllers/checkout.controller');
const notifCtrl     = require('../controllers/notification.controller');
const dashCtrl      = require('../controllers/customerDashboard.controller');
const orderCtrl     = require('../controllers/orderTracking.controller');

const Product       = require('../models/Product');
const Category      = require('../models/Category');
const Brand         = require('../models/Brand');
const City          = require('../models/City');
const CityPricing   = require('../models/CityPricing');
const ProductVariation = require('../models/ProductVariation');
const CategoryFilter   = require('../models/CategoryFilter');
const Order         = require('../models/Order');

const custAuth = [protect, requireRole('CUSTOMER', 'ADMIN')];

// ─── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', ...custAuth, dashCtrl.getDashboard);

// ─── Profile ────────────────────────────────────────────────────────────────
router.get(
  '/profile',
  ...custAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    return ApiResponse.success(res, 200, 'Profile retrieved.', user);
  })
);

router.patch(
  '/profile',
  ...custAuth,
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'companyName', 'gstNumber', 'profileImage'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return ApiResponse.success(res, 200, 'Profile updated.', user);
  })
);

// ─── Cart ────────────────────────────────────────────────────────────────────
router.get   ('/cart',                         ...custAuth, cartCtrl.getCart);
router.post  ('/cart/items',                   ...custAuth, cartCtrl.addItem);
router.patch ('/cart/items/:itemId',           ...custAuth, cartCtrl.updateItem);
router.delete('/cart/items/:itemId',           ...custAuth, cartCtrl.removeItem);
router.patch ('/cart/items/:itemId/save-later',...custAuth, cartCtrl.saveForLater);
router.patch ('/cart/items/:itemId/move-cart', ...custAuth, cartCtrl.moveToCart);
router.delete('/cart',                         ...custAuth, cartCtrl.clearCart);
router.patch ('/cart/city',                    ...custAuth, cartCtrl.setCity);

// ─── Addresses ───────────────────────────────────────────────────────────────
router.get   ('/addresses',                  ...custAuth, addressCtrl.getAll);
router.post  ('/addresses',                  ...custAuth, addressCtrl.create);
router.patch ('/addresses/:id',              ...custAuth, addressCtrl.update);
router.patch ('/addresses/:id/set-default',  ...custAuth, addressCtrl.setDefault);
router.delete('/addresses/:id',              ...custAuth, addressCtrl.remove);

// ─── Checkout ────────────────────────────────────────────────────────────────
router.post('/checkout/validate',    ...custAuth, checkoutCtrl.validate);
router.post('/checkout/place-order', ...custAuth, checkoutCtrl.placeOrder);

// ─── My Orders ───────────────────────────────────────────────────────────────
router.get   ('/orders',                        ...custAuth, orderCtrl.getMyOrders);
router.get   ('/orders/:id',                    ...custAuth, orderCtrl.getMyOrderById);
router.get   ('/orders/:id/tracking',           ...custAuth, orderCtrl.getTracking);
router.get   ('/orders/:id/documents',          ...custAuth, orderCtrl.getDocuments);
router.patch ('/orders/:id/cancel',             ...custAuth, orderCtrl.cancelOrder);
router.patch ('/orders/:id/confirm-delivery',   ...custAuth, orderCtrl.confirmDelivery);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get   ('/notifications',              ...custAuth, notifCtrl.getAll);
router.patch ('/notifications/mark-all-read',...custAuth, notifCtrl.markAllRead);
router.patch ('/notifications/:id/read',     ...custAuth, notifCtrl.markRead);
router.delete('/notifications/:id',          ...custAuth, notifCtrl.remove);

// ─── City List (public — for city selector) ───────────────────────────────────
router.get(
  '/cities',
  asyncHandler(async (req, res) => {
    const cities = await City.find({ status: 'ACTIVE', isServiceable: true })
      .select('name slug state priority sortOrder')
      .sort({ priority: -1, sortOrder: 1 });
    return ApiResponse.success(res, 200, 'Cities retrieved.', cities);
  })
);

// ─── Product Browsing (with city pricing) ────────────────────────────────────
router.get(
  '/products',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { search, category, brand, cityId, assured, express, isTopSelling, isFeatured, page = 1, limit = 24, sort = 'default' } = req.query;

    const filter = { status: 'ACTIVE' };
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (assured === 'true') filter.isAssured = true;
    if (express === 'true') filter.isExpress = true;
    if (isTopSelling === 'true') filter.isTopSelling = true;
    if (isFeatured === 'true') filter.isFeatured = true;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const sortMap = {
      'default':    { displayOrder: 1, createdAt: -1 },
      'price-asc':  { _id: 1 },
      'price-desc': { _id: -1 },
      'newest':     { createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap['default'];

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('brand', 'name slug logo')
        .sort(sortQuery)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    // Attach pricing if cityId provided
    let enriched = products;
    if (cityId) {
      enriched = await Promise.all(
        products.map(async (p) => {
          const pricing = await CityPricing.findOne({ product: p._id, city: cityId, variation: null, isDeleted: false })
            .select('regularPrice salePrice wholesaleSlabs').lean();
          const variations = await ProductVariation.find({ product: p._id, status: 'ACTIVE' })
            .select('attributes sku images sortOrder').lean();
          return { ...p.toJSON(), pricing, variations };
        })
      );
    }

    return ApiResponse.success(res, 200, 'Products retrieved.', enriched, {
      total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
    });
  })
);

// ─── Product Detail ───────────────────────────────────────────────────────────
router.get(
  '/products/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, status: 'ACTIVE' })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo banner description');
    if (!product) return ApiResponse.notFound(res, 'Product not found.');

    const { cityId } = req.query;
    const variations = await ProductVariation.find({ product: product._id, status: 'ACTIVE' })
      .sort({ sortOrder: 1 });

    let pricing = null;
    let variationPricing = [];

    if (cityId) {
      pricing = await CityPricing.findOne({ product: product._id, city: cityId, variation: null, isDeleted: false }).lean();
      variationPricing = await CityPricing.find({ product: product._id, city: cityId, variation: { $ne: null }, isDeleted: false })
        .select('variation regularPrice salePrice wholesaleSlabs').lean();
    }

    // Related products
    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: 'ACTIVE',
    }).limit(8).populate('brand', 'name slug logo').select('name slug images brand isAssured isExpress');

    return ApiResponse.success(res, 200, 'Product retrieved.', {
      ...product.toJSON(), variations, pricing, variationPricing, related,
    });
  })
);

// ─── Category Page ────────────────────────────────────────────────────────────
router.get(
  '/category/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { cityId, page = 1, limit = 24, sort = 'default', brand } = req.query;

    const category = await Category.findOne({ slug: req.params.slug, status: 'ACTIVE' });
    if (!category) return ApiResponse.notFound(res, 'Category not found.');

    const filters = await CategoryFilter.findOne({ category: category._id })
      .populate({ path: 'filters', select: 'label key type options sortOrder isActive' });

    const filter = { status: 'ACTIVE', category: category._id };
    if (brand) filter.brand = brand;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const sortMap  = { 'default': { displayOrder: 1 }, 'newest': { createdAt: -1 } };

    const [products, total, brands] = await Promise.all([
      Product.find(filter)
        .populate('brand', 'name slug logo')
        .sort(sortMap[sort] || sortMap['default'])
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
      Brand.find({ _id: { $in: await Product.distinct('brand', { category: category._id, status: 'ACTIVE' }) } })
        .select('name slug logo').sort({ sortOrder: 1 }),
    ]);

    let enriched = products;
    if (cityId) {
      enriched = await Promise.all(
        products.map(async (p) => {
          const pricing = await CityPricing.findOne({ product: p._id, city: cityId, variation: null, isDeleted: false })
            .select('regularPrice salePrice').lean();
          return { ...p.toJSON(), pricing };
        })
      );
    }

    return ApiResponse.success(res, 200, 'Category page retrieved.', {
      category, products: enriched, brands, filters: filters?.filters || [],
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  })
);

// ─── Brand Landing Page ────────────────────────────────────────────────────────
router.get(
  '/brand/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { cityId, categoryId, page = 1, limit = 24 } = req.query;

    const brand = await Brand.findOne({ slug: req.params.slug, status: 'ACTIVE' });
    if (!brand) return ApiResponse.notFound(res, 'Brand not found.');

    const filter = { status: 'ACTIVE', brand: brand._id };
    if (categoryId) filter.category = categoryId;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [products, total, categories] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
      Category.find({
        _id: { $in: await Product.distinct('category', { brand: brand._id, status: 'ACTIVE' }) },
      }).select('name slug'),
    ]);

    let enriched = products;
    if (cityId) {
      enriched = await Promise.all(
        products.map(async (p) => {
          const pricing = await CityPricing.findOne({ product: p._id, city: cityId, variation: null, isDeleted: false })
            .select('regularPrice salePrice').lean();
          return { ...p.toJSON(), pricing };
        })
      );
    }

    return ApiResponse.success(res, 200, 'Brand page retrieved.', {
      brand, products: enriched, categories,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  })
);

// ─── Public Categories (for navigation, homepage) ────────────────────────────
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const { status = 'ACTIVE', limit = 50 } = req.query;
    const categories = await Category.find({ status })
      .select('name slug image icon description sortOrder')
      .sort({ sortOrder: 1 })
      .limit(parseInt(limit));
    return ApiResponse.success(res, 200, 'Categories retrieved.', categories);
  })
);

// ─── Public Brands (for homepage, filters) ─────────────────────────────────────
router.get(
  '/brands',
  asyncHandler(async (req, res) => {
    const { status = 'ACTIVE', limit = 50 } = req.query;
    const brands = await Brand.find({ status })
      .select('name slug logo banner description sortOrder')
      .sort({ sortOrder: 1 })
      .limit(parseInt(limit));
    return ApiResponse.success(res, 200, 'Brands retrieved.', brands);
  })
);

// ─── Global Search ─────────────────────────────────────────────────────────────
router.get(
  '/search',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q, cityId } = req.query;
    if (!q || q.trim().length < 2) return ApiResponse.badRequest(res, 'Search query must be at least 2 characters.');

    const regex = { $regex: q.trim(), $options: 'i' };

    const [products, categories, brands] = await Promise.all([
      Product.find({ status: 'ACTIVE', $or: [{ name: regex }, { sku: regex }] })
        .limit(10)
        .populate('brand', 'name slug logo')
        .populate('category', 'name slug')
        .select('name slug sku images isAssured isExpress brand category'),
      Category.find({ status: 'ACTIVE', name: regex }).limit(5).select('name slug image'),
      Brand.find({ status: 'ACTIVE', name: regex }).limit(5).select('name slug logo'),
    ]);

    // Attach basic pricing
    let enrichedProducts = products;
    if (cityId) {
      enrichedProducts = await Promise.all(
        products.map(async (p) => {
          const pricing = await CityPricing.findOne({ product: p._id, city: cityId, variation: null, isDeleted: false })
            .select('regularPrice salePrice').lean();
          return { ...p.toJSON(), pricing };
        })
      );
    }

    return ApiResponse.success(res, 200, 'Search results.', { products: enrichedProducts, categories, brands });
  })
);

module.exports = router;
