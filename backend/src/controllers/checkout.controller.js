const asyncHandler  = require('../utils/asyncHandler');
const ApiResponse   = require('../utils/apiResponse');
const AppError      = require('../utils/AppError');
const Cart          = require('../models/Cart');
const Order         = require('../models/Order');
const CityPricing   = require('../models/CityPricing');
const Inventory     = require('../models/Inventory');
const City          = require('../models/City');
const Notification  = require('../models/Notification');
const { sendEmail } = require('../services/email.service');
const { resolveUnitPriceFromCityPricing } = require('../services/checkoutPricing.service');
const { generateMasterOrderNumber, logOrderActivity } = require('../services/order.service');
const { deliveryCityMatchesSelected } = require('../utils/cityNameMatch');

const genOrderNumber = generateMasterOrderNumber;

// POST /customer/checkout/validate
exports.validate = asyncHandler(async (req, res) => {
  const { cityId, addressCity } = req.body;

  const cart = await Cart.findOne({ customer: req.user._id })
    .populate('items.product', 'name sku status gstPercentage')
    .populate('items.variation', 'attributes sku');

  if (!cart || !cart.items.filter(i => !i.savedForLater).length) {
    throw new AppError('Your cart is empty.', 400);
  }

  const city = await City.findById(cityId);
  if (!city || !city.isServiceable || city.status !== 'ACTIVE') {
    throw new AppError('StructBay is not currently serviceable in the selected city.', 422);
  }

  // City match check (aliases, e.g. Bangalore / Bengaluru)
  if (addressCity && !deliveryCityMatchesSelected(city.name, addressCity)) {
    return ApiResponse.error(res, 422,
      `Delivery city (${addressCity}) is not serviceable for your selected shopping city (${city.name}). Update the delivery city or go back to City Selection and choose where you are ordering for.`);
  }

  const activeItems = cart.items.filter(i => !i.savedForLater);
  const lines = [];
  let subtotal = 0;
  let gstTotal = 0;
  const errors = [];

  for (const item of activeItems) {
    if (!item.product || item.product.status !== 'ACTIVE') {
      errors.push(`${item.product?.name || 'A product'} is no longer available.`);
      continue;
    }

    // Pricing
    const pq = { product: item.product._id, city: cityId, isDeleted: false };
    if (item.variation) pq.variation = item.variation._id;
    const pricing = await CityPricing.findOne(pq).lean();
    if (!pricing) {
      errors.push(`Pricing not available for ${item.product.name} in ${city.name}.`);
      continue;
    }

    // Inventory
    const invQ = { product: item.product._id, city: cityId };
    if (item.variation) invQ.variation = item.variation._id;
    const inv = await Inventory.findOne(invQ).lean();
    const available = inv ? Math.max(0, inv.quantity - inv.reserved) : 0;
    if (available < item.quantity) {
      errors.push(`Insufficient stock for ${item.product.name}. Available: ${available}.`);
      continue;
    }

    const unitPrice = resolveUnitPriceFromCityPricing(pricing, item.quantity);
    const lineTotal = unitPrice * item.quantity;
    const gstAmt    = (lineTotal * (item.product.gstPercentage || 18)) / 100;

    subtotal += lineTotal;
    gstTotal += gstAmt;

    lines.push({
      product: item.product._id,
      variation: item.variation?._id || null,
      name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice,
      gstPercentage: item.product.gstPercentage || 18,
      lineTotal,
    });
  }

  if (errors.length) return ApiResponse.error(res, 422, 'Cart has issues.', errors);

  const grandTotal = subtotal + gstTotal;

  return ApiResponse.success(res, 200, 'Cart validated.', {
    lines, subtotal: Math.round(subtotal), gstTotal: Math.round(gstTotal),
    grandTotal: Math.round(grandTotal), city: city.name, cityId,
  });
});

// POST /customer/checkout/place-order
exports.placeOrder = asyncHandler(async (req, res) => {
  const { cityId, addressId, shippingAddress, paymentMethod } = req.body;

  if (!cityId || !shippingAddress) {
    throw new AppError('cityId and shippingAddress are required.', 400);
  }

  const city = await City.findById(cityId);
  if (!city || !city.isServiceable) throw new AppError('City not serviceable.', 422);

  if (shippingAddress?.city && !deliveryCityMatchesSelected(city.name, shippingAddress.city)) {
    throw new AppError(
      `Checkout blocked: delivery address is in "${shippingAddress.city}" but your cart is priced for "${city.name}". Select the same city or change your delivery address.`,
      422
    );
  }

  const cart = await Cart.findOne({ customer: req.user._id })
    .populate('items.product', 'name sku status gstPercentage')
    .populate('items.variation', 'attributes sku');

  const activeItems = cart?.items.filter(i => !i.savedForLater) || [];
  if (!activeItems.length) throw new AppError('Cart is empty.', 400);

  // Build order items & totals
  const orderItems = [];
  let subtotal = 0, gstTotal = 0;

  for (const item of activeItems) {
    const pq = { product: item.product._id, city: cityId, isDeleted: false };
    if (item.variation) pq.variation = item.variation._id;
    const pricing = await CityPricing.findOne(pq).lean();
    if (!pricing) throw new AppError(`Pricing missing for ${item.product.name}.`, 422);

    const unitPrice = resolveUnitPriceFromCityPricing(pricing, item.quantity);
    const lineTotal = unitPrice * item.quantity;
    const gstAmt    = (lineTotal * (item.product.gstPercentage || 18)) / 100;
    subtotal += lineTotal;
    gstTotal += gstAmt;

    orderItems.push({
      product: item.product._id,
      variation: item.variation?._id || null,
      name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice,
      gstPercentage: item.product.gstPercentage || 18,
      lineTotal,
    });

    // Reserve inventory
    const invQ = { product: item.product._id, city: cityId };
    if (item.variation) invQ.variation = item.variation._id;
    await Inventory.findOneAndUpdate(invQ, { $inc: { reserved: item.quantity } });
  }

  const grandTotal = Math.round(subtotal + gstTotal);
  const orderNumber = await genOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: req.user._id,
    city: cityId,
    items: orderItems,
    shippingAddress,
    subtotal: Math.round(subtotal),
    gstTotal: Math.round(gstTotal),
    grandTotal,
    paymentMethod: paymentMethod || null,
    paymentStatus: 'PENDING',
    status: 'VENDOR_ASSIGNMENT_PENDING',
    statusHistory: [{ status: 'VENDOR_ASSIGNMENT_PENDING', changedBy: req.user._id, note: 'Order placed by customer.' }],
  });

  await logOrderActivity({ masterOrder: order._id, actorType: 'CUSTOMER', actor: req.user._id,
    action: 'ORDER_PLACED', description: `Order ${orderNumber} placed by customer.` });

  // Clear cart active items
  await Cart.findOneAndUpdate(
    { customer: req.user._id },
    { $pull: { items: { savedForLater: false } } }
  );

  // Create notification (in-app dashboard; confirmation email sent below)
  await Notification.create({
    customer: req.user._id,
    title: 'Order confirmed',
    message: `Your order ${orderNumber} has been placed. Total: ₹${grandTotal.toLocaleString('en-IN')}. You will receive email and dashboard updates as it progresses.`,
    type: 'ORDER',
    refId: orderNumber,
  });

  // Send confirmation email (non-blocking)
  sendEmail({
    to: req.user.email,
    subject: `Order Confirmed – ${orderNumber} | StructBay`,
    html: `<p>Hi ${req.user.name},</p><p>Your order <strong>${orderNumber}</strong> has been placed successfully.</p><p><strong>Total: ₹${grandTotal.toLocaleString()}</strong></p><p>We will notify you once your order is processed.</p>`,
  }).catch(() => {});

  return ApiResponse.created(res, 'Order placed successfully.', order);
});
