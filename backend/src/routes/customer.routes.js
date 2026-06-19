const router = require('express').Router();
const mongoose = require('mongoose');
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
const Inventory     = require('../models/Inventory');
const ProductVariation = require('../models/ProductVariation');
const CategoryFilter   = require('../models/CategoryFilter');
const Order         = require('../models/Order');
const marketplaceCity = require('../services/marketplaceCity.service');
const catalogBrowse = require('../services/catalogBrowse.service');
const { enrichListingProducts, variationIdString } = require('../services/listingEnrich.service');
const {
  pinMatchesKarnatakaState,
  pinMatchesTelanganaState,
  regionLooksKarnatakaForPin,
  regionLooksTelanganaForPin,
} = require('../utils/indiaPostalRegions');

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
    const allowed = ['name', 'phone', 'companyName', 'gstNumber', 'billingAddress', 'profileImage'];
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
router.get   ('/orders/:id/invoices',           ...custAuth, orderCtrl.getOrderInvoices);
router.get   ('/orders/:id/invoices/:index/file', ...custAuth, orderCtrl.downloadInvoiceFile);
router.get   ('/orders/:id/invoice-summary',    ...custAuth, orderCtrl.downloadInvoiceSummary);
router.get   ('/orders/:id/invoice-pdf',        ...custAuth, orderCtrl.downloadInvoicePdf);
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

// ─── PIN serviceability (public — checkout / city modal) ──────────────────────
const NOT_SERVICEABLE_PIN_MSG =
  'StructBay currently operates in selected cities and PIN codes only. This PIN code is not in our active service area yet. Please choose a listed city or a supported PIN, or contact support for bulk and enterprise delivery options—we will be glad to help.';

function normalizeSixDigitPins(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p) => String(p ?? '').replace(/\D/g, '').slice(0, 6))
    .filter((p) => p.length === 6);
}

function pinSortPrefix(pin6) {
  return pin6.length >= 3 ? pin6.slice(0, 3) : pin6;
}

function cityPayload(city) {
  return {
    id: String(city._id),
    name: city.name,
    state: city.state,
    slug: city.slug,
  };
}

function cityHintsFromQuery(query) {
  const cityName = query.cityName || query.city;
  return {
    cityId: query.cityId,
    cityName: cityName != null && String(cityName).trim() ? String(cityName).trim() : null,
  };
}

async function resolveStorefrontCityOid(query) {
  const { cityId, cityName } = cityHintsFromQuery(query);
  const cityOid = await marketplaceCity.resolveMarketplaceCityId(cityId, cityName);
  return {
    cityOid,
    cityContext: cityId || cityName
      ? {
        requestedCityId: cityId ? String(cityId) : null,
        cityNameHint: cityName,
        resolved: !!cityOid,
        resolvedCityId: cityOid ? String(cityOid) : null,
      }
      : null,
  };
}

router.get(
  '/serviceability/pincode',
  asyncHandler(async (req, res) => {
    const digits = String(req.query.code || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) {
      return ApiResponse.success(res, 200, 'Invalid PIN.', {
        serviceable: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }

    // 1) Exact match on any active serviceable city (admin whitelist)
    const city = await City.findOne({
      status: 'ACTIVE',
      isServiceable: true,
      pincodes: digits,
    })
      .select('name state slug pincodes priority')
      .lean();
    if (city) {
      return ApiResponse.success(res, 200, 'Serviceable.', {
        serviceable: true,
        city: cityPayload(city),
        matchKind: 'EXACT',
      });
    }

    const cityId = String(req.query.cityId || '').trim();

    // 2) Optional: shopper already chose a warehouse city — relax rules for that city only
    if (cityId && mongoose.Types.ObjectId.isValid(cityId)) {
      const sel = await City.findOne({
        _id: cityId,
        status: 'ACTIVE',
        isServiceable: true,
      })
        .select('name state slug pincodes')
        .lean();
      if (sel) {
        const pins = normalizeSixDigitPins(sel.pincodes || []);
        if (pins.length === 0) {
          return ApiResponse.success(res, 200, 'Serviceable (city has no PIN list yet).', {
            serviceable: true,
            city: cityPayload(sel),
            matchKind: 'CITY_OPEN',
          });
        }
        const want = pinSortPrefix(digits);
        const sameDistrict = pins.some((p) => pinSortPrefix(p) === want);
        if (sameDistrict) {
          return ApiResponse.success(res, 200, 'Serviceable (same postal sorting district as configured PINs).', {
            serviceable: true,
            city: cityPayload(sel),
            matchKind: 'DISTRICT_PREFIX',
          });
        }
        // 2b) Selected warehouse city is in Karnataka or Telangana — allow typical in-state PINs
        if (regionLooksKarnatakaForPin(sel) && pinMatchesKarnatakaState(digits)) {
          return ApiResponse.success(res, 200, 'Serviceable (Karnataka PIN range).', {
            serviceable: true,
            city: cityPayload(sel),
            matchKind: 'STATE_REGION_SELECTED',
          });
        }
        if (regionLooksTelanganaForPin(sel) && pinMatchesTelanganaState(digits)) {
          return ApiResponse.success(res, 200, 'Serviceable (Telangana PIN range).', {
            serviceable: true,
            city: cityPayload(sel),
            matchKind: 'STATE_REGION_SELECTED',
          });
        }
      }
    }

    // 3) Infer city from any serviceable city that lists a PIN in the same first-3-digit district (e.g. 560001 vs 560097)
    const prefix = digits.slice(0, 3);
    const prefixRe = new RegExp(`^${prefix}`);
    const inferred = await City.find({
      status: 'ACTIVE',
      isServiceable: true,
      pincodes: prefixRe,
    })
      .select('name state slug pincodes priority')
      .sort({ priority: -1, sortOrder: 1 })
      .limit(1)
      .lean();

    if (inferred.length) {
      return ApiResponse.success(res, 200, 'Serviceable (matched postal district).', {
        serviceable: true,
        city: cityPayload(inferred[0]),
        matchKind: 'DISTRICT_INFERRED',
      });
    }

    // 4) Karnataka (incl. Bengaluru) & Telangana — match PIN to a serviceable hub city in that state
    if (pinMatchesKarnatakaState(digits)) {
      const hub = await City.findOne({
        status: 'ACTIVE',
        isServiceable: true,
        $or: [
          { state: /karnataka/i },
          { state: /^ka$/i },
          { name: /bengaluru|bangalore|bengalore/i },
          { slug: /bengaluru|bangalore/i },
        ],
      })
        .select('name state slug priority')
        .sort({ priority: -1, sortOrder: 1 })
        .lean();
      if (hub) {
        return ApiResponse.success(res, 200, 'Serviceable (Karnataka region).', {
          serviceable: true,
          city: cityPayload(hub),
          matchKind: 'STATE_REGION_INFERRED',
        });
      }
    }
    if (pinMatchesTelanganaState(digits)) {
      const hub = await City.findOne({
        status: 'ACTIVE',
        isServiceable: true,
        $or: [
          { state: /(telangana|telengana)/i },
          { state: /^ts$/i },
          { name: /hyderabad|secunderabad/i },
          { slug: /hyderabad/i },
        ],
      })
        .select('name state slug priority')
        .sort({ priority: -1, sortOrder: 1 })
        .lean();
      if (hub) {
        return ApiResponse.success(res, 200, 'Serviceable (Telangana region).', {
          serviceable: true,
          city: cityPayload(hub),
          matchKind: 'STATE_REGION_INFERRED',
        });
      }
    }

    return ApiResponse.success(res, 200, 'Not serviceable.', {
      serviceable: false,
      message: NOT_SERVICEABLE_PIN_MSG,
    });
  })
);

// ─── Product Browsing (with city pricing) ────────────────────────────────────
router.get(
  '/products',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      search, category, brand, brands: brandsQuery, cityId, assured, express,
      structbayAssured, structbayDelivery,
      isTopSelling, isFeatured, page = 1, limit = 24, sort = 'default',
    } = req.query;

    const filter = { status: 'ACTIVE' };
    if (category) filter.category = category;
    const brandTokens = catalogBrowse
      .parseCommaList(brandsQuery || brand)
      .filter((t) => mongoose.Types.ObjectId.isValid(String(t)));
    if (brandTokens.length === 1) filter.brand = brandTokens[0];
    else if (brandTokens.length > 1) filter.brand = { $in: brandTokens };
    catalogBrowse.applyLegacyAndStructBayBadgeFilters(filter, {
      assured, express, structbayAssured, structbayDelivery,
    });

    if (search) {
      const searchOr = await catalogBrowse.buildProductSearchOr(search);
      if (searchOr) filter.$or = searchOr.$or;
    }
    if (isTopSelling === 'true') filter.isTopSelling = true;
    if (isFeatured === 'true') filter.isFeatured = true;

    const { cityOid, cityContext } = await resolveStorefrontCityOid(req.query);
    if (cityOid) {
      const subset = await catalogBrowse.computeCityScopedProductIdSubset(req.query, cityOid);
      filter._id = { $in: subset };
    }

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

    const enriched = await enrichListingProducts(products, cityOid);

    return ApiResponse.success(res, 200, 'Products retrieved.', enriched, {
      total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
      cityContext,
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

    const { cityOid, cityContext } = await resolveStorefrontCityOid(req.query);
    let listedForPdp = null;
    if (cityOid) {
      listedForPdp = await marketplaceCity.getPricedProductIdsForCity(cityOid);
      const allowed = listedForPdp.some((id) => String(id) === String(product._id));
      if (!allowed) {
        return ApiResponse.notFound(res, 'This product is not available in your selected city.');
      }
    }

    const { resolveProductStructure } = require('../utils/productStructure');
    const structure = await resolveProductStructure(product);
    const isVariantProduct = structure === 'variant';

    const variations = isVariantProduct
      ? await ProductVariation.find({ product: product._id, status: 'ACTIVE' })
        .sort({ sortOrder: 1 })
        .select('attributes sku images sortOrder mrp moq leadTimeDays vendorSku vendorPrice weightKg searchText')
      : [];

    let pricing = null;
    let variationPricing = [];
    let variationInventory = [];
    let baseInventory = null;

    if (cityOid) {
      if (!isVariantProduct) {
        pricing = await CityPricing.findOne({
          product: product._id,
          city: cityOid,
          variation: null,
          isDeleted: false,
          isVisible: true,
        }).lean();
        baseInventory = await Inventory.findOne({
          product: product._id,
          city: cityOid,
          variation: null,
          isDeleted: false,
        })
          .select('quantity reserved lowStockThreshold')
          .lean();
      } else {
        const allCityPricing = await CityPricing.find({
          product: product._id,
          city: cityOid,
          isDeleted: false,
          isVisible: true,
        })
          .select('variation regularPrice salePrice mrp wholesaleSlabs isVisible').lean();
        variationPricing = allCityPricing.filter((row) => row.variation != null);
        const baseVarPricing = allCityPricing.find((row) => !row.variation);
        if (!variationPricing.length && baseVarPricing && variations.length) {
          variationPricing = variations.map((v) => ({
            ...baseVarPricing,
            variation: v._id,
          }));
        }
        variationInventory = await Inventory.find({
          product: product._id,
          city: cityOid,
          variation: { $ne: null },
          isDeleted: false,
        })
          .select('variation quantity reserved lowStockThreshold').lean();
      }
    }

    const stockStatusFromQty = (qty, threshold = 50) => {
      if (qty <= 0) return 'OUT_OF_STOCK';
      if (qty <= threshold) return 'LOW_STOCK';
      return 'IN_STOCK';
    };

    const inventoryByVariation = new Map(
      variationInventory.map((row) => [variationIdString(row.variation), row])
    );
    const pricingByVariation = new Map(
      variationPricing.map((row) => [variationIdString(row.variation), {
        ...row,
        variation: variationIdString(row.variation),
        sellingPrice: row.salePrice ?? row.regularPrice,
      }])
    );
    const enrichedVariations = variations.map((v) => {
      const json = typeof v.toJSON === 'function' ? v.toJSON() : v;
      const vid = variationIdString(json._id);
      const inv = inventoryByVariation.get(vid);
      const qty = inv?.quantity ?? 0;
      const reserved = inv?.reserved ?? 0;
      const available = Math.max(0, qty - reserved);
      const threshold = inv?.lowStockThreshold ?? 50;
      return {
        ...json,
        pricing: pricingByVariation.get(vid) || null,
        inStock: available > 0,
        availableStock: available,
        stockStatus: stockStatusFromQty(available, threshold),
      };
    });

    let inStock = false;
    let availableStock = 0;
    if (isVariantProduct) {
      inStock = enrichedVariations.some((v) => v.inStock);
      availableStock = enrichedVariations.reduce((sum, v) => sum + (v.availableStock || 0), 0);
    } else if (baseInventory) {
      availableStock = Math.max(0, baseInventory.quantity - (baseInventory.reserved || 0));
      inStock = availableStock > 0;
    }

    const productStockStatus = isVariantProduct
      ? (inStock ? 'IN_STOCK' : 'OUT_OF_STOCK')
      : stockStatusFromQty(
        availableStock,
        baseInventory?.lowStockThreshold ?? 50
      );

    // Related products (same category, city-sellable when city selected)
    const relatedBase = {
      category: product.category,
      _id: { $ne: product._id },
      status: 'ACTIVE',
    };
    if (cityOid && listedForPdp) {
      const ids = listedForPdp.filter((id) => String(id) !== String(product._id));
      relatedBase._id = { $in: ids };
    }
    const related = await Product.find(relatedBase)
      .limit(8).populate('brand', 'name slug logo').select('name slug images brand isAssured isExpress isStructbayAssured isStructbayDelivery');

    const catId = product.category?._id || product.category;
    const categoryFilterDoc = await CategoryFilter.findOne({ category: catId }).lean();

    return ApiResponse.success(res, 200, 'Product retrieved.', {
      ...product.toJSON(),
      productStructure: structure,
      variations: isVariantProduct ? enrichedVariations : [],
      pricing: isVariantProduct ? null : (pricing ? { ...pricing, sellingPrice: pricing.salePrice ?? pricing.regularPrice } : null),
      variationPricing: isVariantProduct
        ? variationPricing.map((row) => ({
          ...row,
          variation: variationIdString(row.variation),
          sellingPrice: row.salePrice ?? row.regularPrice,
        }))
        : [],
      variationInventory: isVariantProduct ? variationInventory : [],
      inStock,
      availableStock,
      stockStatus: productStockStatus,
      cityContext,
      related,
      categoryFilters: categoryFilterDoc?.filters || [],
    });
  })
);

// ─── Category Page ────────────────────────────────────────────────────────────
router.get(
  '/category/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { cityId, page = 1, limit = 24, sort = 'default', brand, brands: brandsQuery, search } = req.query;

    const category = await Category.findOne({ slug: req.params.slug, status: 'ACTIVE' });
    if (!category) return ApiResponse.notFound(res, 'Category not found.');

    const categoryFilterDoc = await CategoryFilter.findOne({ category: category._id }).lean();
    const filterDefinitions = categoryFilterDoc?.filters || [];

    const filter = { status: 'ACTIVE', category: category._id };
    const brandTokens = catalogBrowse
      .parseCommaList(brandsQuery || brand)
      .filter((t) => mongoose.Types.ObjectId.isValid(String(t)));
    if (brandTokens.length === 1) filter.brand = brandTokens[0];
    else if (brandTokens.length > 1) filter.brand = { $in: brandTokens };

    catalogBrowse.applyLegacyAndStructBayBadgeFilters(filter, req.query);
    if (search) {
      const searchOr = await catalogBrowse.buildProductSearchOr(search);
      if (searchOr) filter.$or = searchOr.$or;
    }

    const { cityOid, cityContext } = await resolveStorefrontCityOid(req.query);
    const attrProductIdsRaw = await catalogBrowse.narrowProductsByCategoryAttributeFilters(
      category._id,
      req.query,
      categoryFilterDoc
    );
    const attrProductIds = attrProductIdsRaw !== null
      ? await catalogBrowse.unionSimpleProductsForCategory(category._id, attrProductIdsRaw)
      : null;

    if (cityOid) {
      const subset = await catalogBrowse.computeCityScopedProductIdSubset(req.query, cityOid);
      const ids = attrProductIds !== null ? catalogBrowse.intersectIdLists(subset, attrProductIds) : subset;
      filter._id = { $in: ids };
    } else if (attrProductIds !== null) {
      filter._id = { $in: attrProductIds };
    }

    const brandDistinctFilter = { status: 'ACTIVE', category: category._id };
    catalogBrowse.applyLegacyAndStructBayBadgeFilters(brandDistinctFilter, req.query);
    if (search) {
      const searchOr = await catalogBrowse.buildProductSearchOr(search);
      if (searchOr) brandDistinctFilter.$or = searchOr.$or;
    }
    if (cityOid) {
      const subsetBrands = await catalogBrowse.computeCityScopedProductIdSubset(req.query, cityOid);
      const bIds = attrProductIds !== null ? catalogBrowse.intersectIdLists(subsetBrands, attrProductIds) : subsetBrands;
      brandDistinctFilter._id = { $in: bIds };
    } else if (attrProductIds !== null) {
      brandDistinctFilter._id = { $in: attrProductIds };
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const sortKey = String(sort || 'default');
    const sortMap  = {
      default: { displayOrder: 1, createdAt: -1 },
      newest: { createdAt: -1 },
      'price-asc': { displayOrder: 1 },
      'price-desc': { displayOrder: 1 },
      priceLow: { displayOrder: 1 },
      priceHigh: { displayOrder: 1 },
    };
    const usePriceSort = sortKey === 'price-asc' || sortKey === 'price-desc' || sortKey === 'priceLow' || sortKey === 'priceHigh';
    const priceAsc = sortKey === 'price-asc' || sortKey === 'priceLow';

    const [products, total, brands, facetProductIds] = await Promise.all([
      Product.find(filter)
        .populate('brand', 'name slug logo')
        .sort(sortMap[sortKey] || sortMap.default)
        .skip(usePriceSort ? 0 : (pageNum - 1) * limitNum)
        .limit(usePriceSort ? 5000 : limitNum),
      Product.countDocuments(filter),
      Brand.find({ _id: { $in: await Product.distinct('brand', brandDistinctFilter) } })
        .select('name slug logo').sort({ sortOrder: 1 }),
      (async () => {
        const baseIds = await Product.find({ status: 'ACTIVE', category: category._id }).distinct('_id');
        if (cityOid) {
          const priced = await marketplaceCity.getPricedProductIdsForCity(cityOid);
          const pricedSet = new Set(priced.map((id) => String(id)));
          return baseIds.filter((id) => pricedSet.has(String(id)));
        }
        return baseIds;
      })(),
    ]);

    const enriched = await enrichListingProducts(products, cityOid);

    if (usePriceSort) {
      enriched = enriched.sort((a, b) => {
        const pa = catalogBrowse.listingUnitPriceFromEnriched(a);
        const pb = catalogBrowse.listingUnitPriceFromEnriched(b);
        return priceAsc ? pa - pb : pb - pa;
      });
      enriched = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    }

    const facets = await catalogBrowse.distinctAttributeValuesForProducts(
      facetProductIds,
      filterDefinitions
    );
    const enrichedFilters = catalogBrowse.appendDiscoveredAttributeFilters(
      catalogBrowse.enrichCategoryFilterDefinitions(filterDefinitions, facets),
      facets
    );
    const priceBounds = cityOid
      ? await catalogBrowse.computeCategoryPriceBounds(cityOid, facetProductIds)
      : null;

    return ApiResponse.success(res, 200, 'Category page retrieved.', {
      category,
      products: enriched,
      brands,
      filters: enrichedFilters,
      priceBounds,
      cityContext,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  })
);

// ─── Brand Landing Page ────────────────────────────────────────────────────────
router.get(
  '/brand/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { cityId, categoryId, page = 1, limit = 24, search } = req.query;

    const brand = await Brand.findOne({ slug: req.params.slug, status: 'ACTIVE' });
    if (!brand) return ApiResponse.notFound(res, 'Brand not found.');

    const filter = { status: 'ACTIVE', brand: brand._id };
    if (categoryId) filter.category = categoryId;
    catalogBrowse.applyLegacyAndStructBayBadgeFilters(filter, req.query);
    if (search) {
      const searchOr = await catalogBrowse.buildProductSearchOr(search);
      if (searchOr) filter.$or = searchOr.$or;
    }

    const { cityOid: cityOidBrand, cityContext } = await resolveStorefrontCityOid(req.query);
    if (cityOidBrand) {
      const subset = await catalogBrowse.computeCityScopedProductIdSubset(req.query, cityOidBrand);
      filter._id = { $in: subset };
    }

    const categoryDistinctFilter = { status: 'ACTIVE', brand: brand._id };
    catalogBrowse.applyLegacyAndStructBayBadgeFilters(categoryDistinctFilter, req.query);
    if (search) {
      const searchOr = await catalogBrowse.buildProductSearchOr(search);
      if (searchOr) categoryDistinctFilter.$or = searchOr.$or;
    }
    if (cityOidBrand) {
      const subsetCat = await catalogBrowse.computeCityScopedProductIdSubset(req.query, cityOidBrand);
      categoryDistinctFilter._id = { $in: subsetCat };
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [products, total, categories] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
      Category.find({
        _id: { $in: await Product.distinct('category', categoryDistinctFilter) },
      }).select('name slug'),
    ]);

    const enriched = await enrichListingProducts(products, cityOidBrand);

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
    const { status = 'ACTIVE', limit = 50, cityId } = req.query;
    const lim = Math.min(100, parseInt(limit));

    const { cityOid } = await resolveStorefrontCityOid(req.query);
    let catFilter = { status };
    if (cityOid) {
      const priced = await marketplaceCity.getPricedProductIdsForCity(cityOid);
      const catIds = await Product.distinct('category', { status: 'ACTIVE', _id: { $in: priced } });
      catFilter._id = { $in: catIds };
    }

    const categories = await Category.find(catFilter)
      .select('name slug image icon description sortOrder')
      .sort({ sortOrder: 1 })
      .limit(lim)
      .lean();

    const catIds = categories.map((c) => c._id);
    let countMatch = { status: 'ACTIVE', category: { $in: catIds } };
    if (cityOid) {
      const priced = await marketplaceCity.getPricedProductIdsForCity(cityOid);
      countMatch._id = { $in: priced };
    }
    const countRows =
      catIds.length === 0
        ? []
        : await Product.aggregate([
            { $match: countMatch },
            { $group: { _id: '$category', productCount: { $sum: 1 } } },
          ]);
    const countMap = new Map(countRows.map((r) => [String(r._id), r.productCount]));
    const categoriesWithCounts = categories.map((c) => ({
      ...c,
      productCount: countMap.get(String(c._id)) || 0,
    }));

    return ApiResponse.success(res, 200, 'Categories retrieved.', categoriesWithCounts);
  })
);

// ─── Public Brands (for homepage, filters) ─────────────────────────────────────
router.get(
  '/brands',
  asyncHandler(async (req, res) => {
    const { status = 'ACTIVE', limit = 50, cityId } = req.query;
    const lim = Math.min(100, parseInt(limit));

    const { cityOid } = await resolveStorefrontCityOid(req.query);
    let brandFilter = { status };
    if (cityOid) {
      const priced = await marketplaceCity.getPricedProductIdsForCity(cityOid);
      const brandIds = await Product.distinct('brand', { status: 'ACTIVE', _id: { $in: priced } });
      brandFilter._id = { $in: brandIds };
    }

    const brands = await Brand.find(brandFilter)
      .select('name slug logo banner description sortOrder category')
      .populate('category', 'name slug')
      .sort({ sortOrder: 1 })
      .limit(lim);
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

    const { cityOid: cityOidSearch } = await resolveStorefrontCityOid(req.query);
    const productMatch = { status: 'ACTIVE' };
    catalogBrowse.applyLegacyAndStructBayBadgeFilters(productMatch, req.query);
    const searchOr = await catalogBrowse.buildProductSearchOr(q.trim());
    if (searchOr) productMatch.$or = searchOr.$or;
    if (cityOidSearch) {
      const subset = await catalogBrowse.computeCityScopedProductIdSubset(req.query, cityOidSearch);
      productMatch._id = { $in: subset };
    }

    const regex = { $regex: q.trim(), $options: 'i' };

    const [products, categories, brands] = await Promise.all([
      Product.find(productMatch)
        .limit(10)
        .populate('brand', 'name slug logo')
        .populate('category', 'name slug')
        .select('name slug sku images isAssured isExpress isStructbayAssured isStructbayDelivery brand category'),
      Category.find({ status: 'ACTIVE', name: regex }).limit(5).select('name slug image'),
      Brand.find({ status: 'ACTIVE', name: regex }).limit(5).select('name slug logo'),
    ]);

    const pricedSearchList = cityOidSearch
      ? await marketplaceCity.getPricedProductIdsForCity(cityOidSearch)
      : null;

    let categoriesOut = categories;
    let brandsOut = brands;
    if (pricedSearchList?.length) {
      const allowedCats = new Set(
        (await Product.distinct('category', { status: 'ACTIVE', _id: { $in: pricedSearchList } })).map(String)
      );
      const allowedBrands = new Set(
        (await Product.distinct('brand', { status: 'ACTIVE', _id: { $in: pricedSearchList } })).map(String)
      );
      categoriesOut = categories.filter((c) => allowedCats.has(String(c._id)));
      brandsOut = brands.filter((b) => allowedBrands.has(String(b._id)));
    }

    const enrichedProducts = await enrichListingProducts(products, cityOidSearch);

    return ApiResponse.success(res, 200, 'Search results.', { products: enrichedProducts, categories: categoriesOut, brands: brandsOut });
  })
);

module.exports = router;
