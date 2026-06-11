const asyncHandler   = require('../utils/asyncHandler');
const ApiResponse    = require('../utils/apiResponse');
const AppError       = require('../utils/AppError');
const Shipment       = require('../models/Shipment');
const VendorOrder    = require('../models/VendorOrder');
const Order          = require('../models/Order');
const { logOrderActivity, notifyCustomer } = require('../services/order.service');

// ─── POST /shipments ──────────────────────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const {
    masterOrderId, vendorOrderId,
    logisticsPartner, customPartnerName,
    driverName, driverPhone, vehicleNumber, vehicleType,
    trackingNumber, trackingUrl, estimatedDelivery,
  } = req.body;

  const masterOrder = await Order.findById(masterOrderId);
  if (!masterOrder) throw new AppError('Master order not found.', 404);

  const vendorOrder = await VendorOrder.findById(vendorOrderId);
  if (!vendorOrder) throw new AppError('Vendor order not found.', 404);

  const shipment = await Shipment.create({
    masterOrder: masterOrderId,
    vendorOrder:  vendorOrderId,
    logisticsPartner, customPartnerName,
    driverName, driverPhone, vehicleNumber, vehicleType,
    trackingNumber, trackingUrl, estimatedDelivery,
    status: 'CREATED',
    createdBy: req.user._id,
    timeline: [{ status: 'CREATED', description: 'Shipment created.', timestamp: new Date(), updatedBy: req.user._id }],
  });

  // Update vendor order status
  await VendorOrder.findByIdAndUpdate(vendorOrderId, {
    status: 'DISPATCH_CONFIRMED',
    actualDispatchDate: new Date(),
    $push: { statusHistory: { status: 'DISPATCH_CONFIRMED', updatedBy: req.user._id, model: 'User', note: `Shipment ${shipment._id} created.` } },
  });

  await logOrderActivity({ masterOrder: masterOrderId, vendorOrder: vendorOrderId,
    actorType: 'ADMIN', actor: req.user._id,
    action: 'DISPATCH_CONFIRMED', description: `Shipment created. Logistics: ${logisticsPartner}` });

  return ApiResponse.created(res, 'Shipment created.', shipment);
});

// ─── GET /shipments/:id ───────────────────────────────────────────────────────
exports.getById = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('masterOrder', 'orderNumber customer')
    .populate('vendorOrder', 'orderNumber vendor')
    .populate('createdBy', 'name');
  if (!shipment) throw new AppError('Shipment not found.', 404);
  return ApiResponse.success(res, 200, 'Shipment retrieved.', shipment);
});

// ─── GET /shipments (by order) ────────────────────────────────────────────────
exports.getByOrder = asyncHandler(async (req, res) => {
  const { masterOrderId, vendorOrderId } = req.query;
  const filter = {};
  if (masterOrderId) filter.masterOrder = masterOrderId;
  if (vendorOrderId) filter.vendorOrder = vendorOrderId;
  const shipments = await Shipment.find(filter).sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Shipments retrieved.', shipments);
});

// ─── PATCH /shipments/:id/status ─────────────────────────────────────────────
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, description, location } = req.body;
  if (!status) throw new AppError('status required.', 400);

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) throw new AppError('Shipment not found.', 404);

  shipment.status = status;
  shipment.timeline.push({ status, description, location, timestamp: new Date(), updatedBy: req.user._id });
  if (status === 'DELIVERED') {
    shipment.actualDelivery = new Date();
    shipment.receivedBy  = req.body.receivedBy || null;
    shipment.receivedAt  = new Date();
  }
  await shipment.save();

  // Sync master order status on delivery
  if (status === 'DELIVERED') {
    const order = await Order.findById(shipment.masterOrder);
    if (order) {
      const allVendorOrders = await VendorOrder.find({ masterOrder: order._id, status: { $ne: 'CANCELLED' } });
      const deliveredCount  = allVendorOrders.filter((v) => v.status === 'DELIVERED' || v.status === 'COMPLETED').length;
      const newStatus = deliveredCount === allVendorOrders.length ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
      order.status = newStatus;
      order.statusHistory.push({ status: newStatus, changedBy: req.user._id, note: 'Updated from shipment delivery.' });
      await order.save();
      await notifyCustomer({ customerId: order.customer,
        title: newStatus === 'DELIVERED' ? 'Order Delivered' : 'Partial Delivery',
        type: 'ORDER', refId: order.orderNumber,
        message: `Your order ${order.orderNumber} has been ${newStatus === 'DELIVERED' ? 'fully delivered' : 'partially delivered'}.` });
    }
  }

  await logOrderActivity({ masterOrder: shipment.masterOrder, vendorOrder: shipment.vendorOrder,
    actorType: 'ADMIN', actor: req.user._id, action: 'STATUS_CHANGED',
    description: `Shipment status: ${status}. ${description || ''}` });

  return ApiResponse.success(res, 200, 'Shipment status updated.', shipment);
});

// ─── POST /shipments/:id/delivery-notes ──────────────────────────────────────
exports.addDeliveryNote = asyncHandler(async (req, res) => {
  const { note, visibleToCustomer = true } = req.body;
  if (!note) throw new AppError('note required.', 400);

  const shipment = await Shipment.findByIdAndUpdate(
    req.params.id,
    { $push: { deliveryNotes: { note, addedBy: req.user._id, visibleToCustomer } } },
    { new: true }
  );
  if (!shipment) throw new AppError('Shipment not found.', 404);

  await logOrderActivity({ masterOrder: shipment.masterOrder, vendorOrder: shipment.vendorOrder,
    actorType: 'ADMIN', actor: req.user._id, action: 'NOTE_ADDED', description: `Delivery note: ${note}` });

  return ApiResponse.success(res, 200, 'Delivery note added.', shipment);
});

// ─── POST /shipments/:id/pod ──────────────────────────────────────────────────
exports.uploadPOD = asyncHandler(async (req, res) => {
  const { url, cloudinaryId, type = 'photo' } = req.body;
  if (!url) throw new AppError('url required.', 400);

  const shipment = await Shipment.findByIdAndUpdate(
    req.params.id,
    { $push: { pod: { type, url, cloudinaryId, uploadedAt: new Date() } } },
    { new: true }
  );
  if (!shipment) throw new AppError('Shipment not found.', 404);

  await logOrderActivity({ masterOrder: shipment.masterOrder, vendorOrder: shipment.vendorOrder,
    actorType: 'ADMIN', actor: req.user._id, action: 'DOCUMENT_UPLOADED', description: 'Proof of delivery uploaded.' });

  return ApiResponse.success(res, 200, 'POD uploaded.', shipment);
});
