const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const Cart         = require('../models/Cart');
const Product      = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const CityPricing  = require('../models/CityPricing');
const Inventory    = require('../models/Inventory');
const User         = require('../models/User');
const { ROLES, VENDOR_STATUS } = require('../config/constants');

const populateCart = (query) =>
  query
    .populate({ path: 'items.product', select: 'name sku images isAssured isExpress isStructbayAssured isStructbayDelivery gstPercentage status' })
    .populate({ path: 'items.variation', select: 'attributes sku images mrp moq leadTimeDays vendorSku weightKg' })
    .populate({ path: 'items.vendorUser', select: 'name email companyName' })
    .populate('city', 'name slug');

// Compute line pricing from CityPricing engine
const getPricing = async (productId, variationId, cityId) => {
  const q = { product: productId, city: cityId, isDeleted: false };
  if (variationId) q.variation = variationId;
  return CityPricing.findOne(q).lean();
};

// GET /customer/cart
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await populateCart(Cart.findOne({ customer: req.user._id }));
  if (!cart) {
    cart = await Cart.create({ customer: req.user._id, items: [] });
  }

  // Enrich items with pricing
  const cityId = cart.city;
  const enriched = await Promise.all(
    cart.items.map(async (item) => {
      const pricing = cityId
        ? await getPricing(item.product?._id, item.variation?._id, cityId)
        : null;
      const inv = cityId
        ? await Inventory.findOne({
          product: item.product?._id,
          city: cityId,
          variation: item.variation?._id || null,
        }).lean()
        : null;
      return {
        ...item.toJSON(),
        pricing,
        available: inv ? Math.max(0, inv.quantity - inv.reserved) : null,
      };
    })
  );

  return ApiResponse.success(res, 200, 'Cart retrieved.', { ...cart.toJSON(), items: enriched });
});

// POST /customer/cart/items  { productId, variationId?, quantity, cityId?, vendorUserId? }
exports.addItem = asyncHandler(async (req, res) => {
  const { productId, variationId, quantity = 1, cityId, vendorUserId } = req.body;
  if (!productId) throw new AppError('productId is required.', 400);

  const product = await Product.findById(productId);
  if (!product || product.status !== 'ACTIVE') throw new AppError('Product not available.', 404);

  if (variationId) {
    const v = await ProductVariation.findOne({ _id: variationId, product: productId });
    if (!v || v.status !== 'ACTIVE') throw new AppError('Variation not available.', 404);
  }

  let vendorUser = null;
  if (vendorUserId) {
    vendorUser = await User.findOne({
      _id: vendorUserId,
      role: ROLES.VENDOR,
      vendorStatus: VENDOR_STATUS.APPROVED,
    }).select('_id');
    if (!vendorUser) throw new AppError('Invalid or unapproved vendor user.', 400);
  }

  let cart = await Cart.findOne({ customer: req.user._id });
  if (!cart) cart = new Cart({ customer: req.user._id, items: [] });

  if (cityId) cart.city = cityId;

  const vUserId = vendorUser ? String(vendorUser._id) : '';
  const existingIdx = cart.items.findIndex(
    (i) =>
      i.product.toString() === productId &&
      (variationId ? i.variation?.toString() === variationId : !i.variation) &&
      (vendorUserId ? (i.vendorUser && i.vendorUser.toString() === vUserId) : !i.vendorUser) &&
      !i.savedForLater
  );

  if (existingIdx >= 0) {
    cart.items[existingIdx].quantity += Number(quantity);
  } else {
    cart.items.push({
      product: productId,
      variation: variationId || null,
      vendorUser: vendorUser ? vendorUser._id : null,
      quantity: Number(quantity),
    });
  }

  await cart.save();
  cart = await populateCart(Cart.findOne({ customer: req.user._id }));
  return ApiResponse.success(res, 200, 'Item added to cart.', cart);
});

// PATCH /customer/cart/items/:itemId  { quantity }
exports.updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ customer: req.user._id });
  if (!cart) throw new AppError('Cart not found.', 404);

  const item = cart.items.id(req.params.itemId);
  if (!item) throw new AppError('Cart item not found.', 404);

  if (Number(quantity) <= 0) {
    item.deleteOne();
  } else {
    item.quantity = Number(quantity);
  }
  await cart.save();
  return ApiResponse.success(res, 200, 'Cart updated.', cart);
});

// DELETE /customer/cart/items/:itemId
exports.removeItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customer: req.user._id });
  if (!cart) throw new AppError('Cart not found.', 404);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw new AppError('Cart item not found.', 404);
  item.deleteOne();
  await cart.save();
  return ApiResponse.success(res, 200, 'Item removed from cart.');
});

// PATCH /customer/cart/items/:itemId/save-for-later
exports.saveForLater = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customer: req.user._id });
  if (!cart) throw new AppError('Cart not found.', 404);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw new AppError('Item not found.', 404);
  item.savedForLater = true;
  await cart.save();
  return ApiResponse.success(res, 200, 'Saved for later.');
});

// PATCH /customer/cart/items/:itemId/move-to-cart
exports.moveToCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customer: req.user._id });
  if (!cart) throw new AppError('Cart not found.', 404);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw new AppError('Item not found.', 404);
  item.savedForLater = false;
  await cart.save();
  return ApiResponse.success(res, 200, 'Moved to cart.');
});

// DELETE /customer/cart  (clear all)
exports.clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ customer: req.user._id }, { items: [] });
  return ApiResponse.success(res, 200, 'Cart cleared.');
});

// PATCH /customer/cart/city  { cityId }
exports.setCity = asyncHandler(async (req, res) => {
  const { cityId } = req.body;
  if (!cityId) throw new AppError('cityId is required.', 400);
  let cart = await Cart.findOne({ customer: req.user._id });
  if (!cart) cart = new Cart({ customer: req.user._id, items: [] });
  cart.city = cityId;
  await cart.save();
  return ApiResponse.success(res, 200, 'Cart city updated.', cart);
});
