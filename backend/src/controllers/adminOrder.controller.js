const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Order = require('../models/Order');
const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');
const City = require('../models/City');
const { generateMasterOrderNumber, logOrderActivity } = require('../services/order.service');
const { resolveUnitPriceFromCityPricing } = require('../services/checkoutPricing.service');
const { resolveProductDeliveryType } = require('../utils/productDeliveryType');
const { formatVariationLabel } = require('../utils/variationAttributes');
const { sendOrderPlacedEmail } = require('../services/email.service');
const { notifyAllAdmins } = require('../services/staffNotification.service');
const crypto = require('crypto');
const Product = require('../models/Product');

function resolveGstPct(productGst, overrideRate) {
  const allowed = [0, 12, 18];
  if (overrideRate !== null && allowed.includes(overrideRate)) return overrideRate;
  const pg = Number(productGst);
  if (allowed.includes(pg)) return pg;
  return 18;
}

exports.searchCustomers = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  if (!q || q.length < 2) return ApiResponse.success(res, 200, 'Search results', []);

  const regex = new RegExp(q, 'i');
  const customers = await User.find({
    role: { $in: ['CUSTOMER', 'ADMIN'] },
    $or: [{ name: regex }, { email: regex }, { phone: regex }],
  })
    .select('name email phone companyName status')
    .limit(10)
    .lean();

  return ApiResponse.success(res, 200, 'Search results', customers);
});

exports.getCustomerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.params.id })
    .select('orderNumber createdAt grandTotal status')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return ApiResponse.success(res, 200, 'Customer orders', orders);
});

exports.createOrder = asyncHandler(async (req, res) => {
  let { customer, isNewCustomer, items, cityId, shippingAddress, paymentMethod, paymentStatus, deliveryType } = req.body;

  if (!cityId || !shippingAddress || !items || !items.length) {
    throw new AppError('City, shipping address, and items are required.', 400);
  }

  const city = await City.findById(cityId);
  if (!city || !city.isServiceable) throw new AppError('City not serviceable.', 422);

  let customerId;

  // Flow 2: Create new customer
  if (isNewCustomer) {
    if (!customer.name || !customer.email || !customer.phone) {
      throw new AppError('Name, email, and phone are required for a new customer.', 400);
    }
    const exists = await User.findOne({ $or: [{ email: customer.email }, { phone: customer.phone }] });
    if (exists) {
      throw new AppError('User with this email or phone already exists.', 400);
    }

    const newUser = await User.create({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      companyName: customer.companyName,
      gstNumber: customer.gstNumber,
      role: 'CUSTOMER',
      password: crypto.randomBytes(16).toString('hex'), // Random password, they can reset it
      isEmailVerified: true, // Created by admin, assume verified
      status: 'ACTIVE',
    });
    customerId = newUser._id;
  } else {
    customerId = customer._id || customer;
  }

  const userDoc = await User.findById(customerId);
  if (!userDoc || userDoc.role !== 'CUSTOMER') throw new AppError('Valid customer not found.', 404);

  let subtotal = 0;
  let gstTotal = 0;
  const orderItems = [];

  // Populate products to match checkout logic
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
    
    let variation = null;
    if (item.variation) {
      const ProductVariation = require('../models/ProductVariation');
      variation = await ProductVariation.findById(item.variation);
    }

    const pq = { product: product._id, city: cityId, isDeleted: false };
    if (variation) pq.variation = variation._id;
    
    const pricing = await CityPricing.findOne(pq).lean();
    if (!pricing) throw new AppError(`Pricing missing for ${product.name} in ${city.name}.`, 422);

    const rawUnitPrice = resolveUnitPriceFromCityPricing(pricing, item.quantity);
    const rawLineTotal = rawUnitPrice * item.quantity;
    const gstPct = resolveGstPct(product.gstPercentage, null);

    let baseLineTotal, gstAmt;
    if (product.priceIncludesGst) {
      baseLineTotal = rawLineTotal / (1 + (gstPct / 100));
      gstAmt = rawLineTotal - baseLineTotal;
    } else {
      baseLineTotal = rawLineTotal;
      gstAmt = (baseLineTotal * gstPct) / 100;
    }

    subtotal += baseLineTotal;
    gstTotal += gstAmt;

    const productDeliveryType = deliveryType || resolveProductDeliveryType(product);

    orderItems.push({
      product: product._id,
      variation: variation?._id || null,
      name: product.name,
      sku: variation?.sku || product.sku,
      variationLabel: variation ? formatVariationLabel(variation.attributes) : null,
      quantity: item.quantity,
      unitPrice: baseLineTotal / item.quantity,
      gstPercentage: gstPct,
      lineTotal: baseLineTotal,
      vendorUser: null,
      defaultDeliveryType: resolveProductDeliveryType(product),
      deliveryType: productDeliveryType,
    });

    // Reserve inventory
    if (!product.alwaysInStock) {
      const invQ = { product: product._id, city: cityId };
      if (variation) invQ.variation = variation._id;
      await Inventory.findOneAndUpdate(invQ, { $inc: { reserved: item.quantity } });
    }
  }

  const grandTotal = Math.round(subtotal + gstTotal);
  const orderNumber = await generateMasterOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: customerId,
    city: cityId,
    shippingAddress,
    items: orderItems,
    subtotal: Math.round(subtotal),
    gstTotal: Math.round(gstTotal),
    discountTotal: 0,
    shippingTotal: 0,
    grandTotal,
    paymentMethod: paymentMethod || 'Online',
    paymentStatus: paymentStatus || 'PENDING',
    status: 'VENDOR_ASSIGNMENT_PENDING',
  });

  await logOrderActivity(order._id, 'Order created by Admin.', req.user._id, 'User');

  // Notify customer
  sendOrderPlacedEmail(order._id).catch(() => {});
  notifyAllAdmins({
    type: 'NEW_ORDER',
    title: 'Order created by Admin',
    message: `Admin ${req.user.name} created order ${order.orderNumber} for ${userDoc.name} (₹${order.grandTotal})`,
    relatedOrder: order._id,
  }).catch(() => {});

  return ApiResponse.success(res, 201, 'Order created successfully.', { orderId: order._id, orderNumber: order.orderNumber });
});
