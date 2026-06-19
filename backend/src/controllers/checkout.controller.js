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
const { notifyAllAdmins } = require('../services/staffNotification.service');
const { resolveUnitPriceFromCityPricing } = require('../services/checkoutPricing.service');
const { generateMasterOrderNumber, logOrderActivity } = require('../services/order.service');
const { deliveryCityMatchesSelected } = require('../utils/cityNameMatch');
const { resolveProductDeliveryType } = require('../utils/productDeliveryType');
const { productRequiresVariation } = require('../utils/productStructure');
const { formatVariationLabel } = require('../utils/variationAttributes');

const genOrderNumber = generateMasterOrderNumber;

function resolveGstPct(productGst, overrideRate) {
  const allowed = [0, 12, 18];
  if (overrideRate !== null && allowed.includes(overrideRate)) return overrideRate;
  const pg = Number(productGst);
  if (allowed.includes(pg)) return pg;
  return 18;
}

// POST /customer/checkout/validate
exports.validate = asyncHandler(async (req, res) => {
  const { cityId, addressCity, gstRate: gstRateRaw } = req.body;
  const gstRateOverride = [0, 12, 18].includes(Number(gstRateRaw)) ? Number(gstRateRaw) : null;

  const cart = await Cart.findOne({ customer: req.user._id })
    .populate('items.product', 'name sku status gstPercentage productStructure')
    .populate('items.variation', 'attributes sku')
    .populate('items.vendorUser', 'name companyName');

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

    if (await productRequiresVariation(item.product._id) && !item.variation) {
      errors.push(`Please select a variant for ${item.product.name}.`);
      continue;
    }
    if (!(await productRequiresVariation(item.product._id)) && item.variation) {
      errors.push(`${item.product.name} is a simple product — remove variant selection and add again.`);
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
    const gstPct = resolveGstPct(item.product.gstPercentage, gstRateOverride);
    const gstAmt = (lineTotal * gstPct) / 100;

    subtotal += lineTotal;
    gstTotal += gstAmt;

    lines.push({
      product: item.product._id,
      variation: item.variation?._id || null,
      name: item.product.name,
      sku: item.variation?.sku || item.product.sku,
      variationLabel: item.variation ? formatVariationLabel(item.variation.attributes) : null,
      quantity: item.quantity,
      unitPrice,
      gstPercentage: gstPct,
      lineTotal,
      vendorUser: item.vendorUser?._id || null,
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
  const { cityId, addressId, shippingAddress, paymentMethod, gstRate: gstRateRaw } = req.body;
  const gstRateOverride = [0, 12, 18].includes(Number(gstRateRaw)) ? Number(gstRateRaw) : null;

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
    .populate('items.product', 'name sku status gstPercentage deliveryType isStructbayDelivery isExpress structbayDeliverySupported productStructure')
    .populate('items.variation', 'attributes sku')
    .populate('items.vendorUser', 'name companyName');

  const activeItems = cart?.items.filter(i => !i.savedForLater) || [];
  if (!activeItems.length) throw new AppError('Cart is empty.', 400);

  // Build order items & totals
  const orderItems = [];
  let subtotal = 0, gstTotal = 0;

  for (const item of activeItems) {
    if (await productRequiresVariation(item.product._id) && !item.variation) {
      throw new AppError(`Please select a variant for ${item.product.name}.`, 422);
    }
    if (!(await productRequiresVariation(item.product._id)) && item.variation) {
      throw new AppError(`${item.product.name} is a simple product and does not use variants.`, 422);
    }

    const pq = { product: item.product._id, city: cityId, isDeleted: false };
    if (item.variation) pq.variation = item.variation._id;
    const pricing = await CityPricing.findOne(pq).lean();
    if (!pricing) throw new AppError(`Pricing missing for ${item.product.name}.`, 422);

    const unitPrice = resolveUnitPriceFromCityPricing(pricing, item.quantity);
    const lineTotal = unitPrice * item.quantity;
    const gstPct = resolveGstPct(item.product.gstPercentage, gstRateOverride);
    const gstAmt = (lineTotal * gstPct) / 100;
    subtotal += lineTotal;
    gstTotal += gstAmt;

    const productDeliveryType = resolveProductDeliveryType(item.product);

    orderItems.push({
      product: item.product._id,
      variation: item.variation?._id || null,
      name: item.product.name,
      sku: item.variation?.sku || item.product.sku,
      variationLabel: item.variation ? formatVariationLabel(item.variation.attributes) : null,
      quantity: item.quantity,
      unitPrice,
      gstPercentage: gstPct,
      lineTotal,
      vendorUser: item.vendorUser?._id || null,
      defaultDeliveryType: productDeliveryType,
      deliveryType: productDeliveryType,
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

  notifyAllAdmins({
    type: 'NEW_ORDER',
    title: 'New order received',
    message: `Order ${orderNumber} from ${req.user.name || 'customer'} · ₹${grandTotal.toLocaleString('en-IN')}`,
    relatedMasterOrder: order._id,
    metadata: { orderNumber, customerName: req.user.name },
  }).catch(() => {});

  // Send confirmation email (non-blocking)
  sendEmail({
    to: req.user.email,
    subject: `Order Confirmed – ${orderNumber} | StructBay`,
    html: `<p>Hi ${req.user.name},</p><p>Your order <strong>${orderNumber}</strong> has been placed successfully.</p><p><strong>Total: ₹${grandTotal.toLocaleString()}</strong></p><p>We will notify you once your order is processed.</p>`,
  }).catch(() => {});

  return ApiResponse.created(res, 'Order placed successfully.', order);
});
