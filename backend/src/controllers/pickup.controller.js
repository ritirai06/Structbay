const asyncHandler     = require('../utils/asyncHandler');
const ApiResponse      = require('../utils/apiResponse');
const AppError         = require('../utils/AppError');
const PickupSchedule   = require('../models/PickupSchedule');
const VendorOrder      = require('../models/VendorOrder');
const VendorNotification = require('../models/VendorNotification');
const { logOrderActivity } = require('../services/order.service');

// ─── POST /pickup-schedules ───────────────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const {
    masterOrderId, vendorOrderId, vendorId,
    pickupDate, pickupTime, pickupLocation,
    contactPerson, contactNumber,
    logisticsPartner, driverName, driverPhone, vehicleNumber, remarks,
  } = req.body;

  const vendorOrder = await VendorOrder.findById(vendorOrderId);
  if (!vendorOrder) throw new AppError('Vendor order not found.', 404);

  const schedule = await PickupSchedule.create({
    masterOrder: masterOrderId,
    vendorOrder:  vendorOrderId,
    vendor:       vendorId,
    pickupDate, pickupTime, pickupLocation,
    contactPerson, contactNumber,
    logisticsPartner, driverName, driverPhone, vehicleNumber, remarks,
    createdBy: req.user._id,
  });

  // Update vendor order status
  await VendorOrder.findByIdAndUpdate(vendorOrderId, {
    status: 'PICKUP_SCHEDULED',
    $push: { statusHistory: { status: 'PICKUP_SCHEDULED', updatedBy: req.user._id, model: 'User', note: `Pickup on ${pickupDate}` } },
  });

  // Notify vendor
  await VendorNotification.create({
    vendor: vendorId, type: 'pickup_scheduled',
    title: 'Pickup Scheduled',
    message: `Pickup for sub-order ${vendorOrder.orderNumber} scheduled on ${pickupDate} at ${pickupTime}.`,
    orderId: vendorOrderId,
  }).catch(() => {});

  await logOrderActivity({ masterOrder: masterOrderId, vendorOrder: vendorOrderId,
    actorType: 'ADMIN', actor: req.user._id, action: 'PICKUP_SCHEDULED',
    description: `Pickup scheduled: ${pickupDate} ${pickupTime}` });

  return ApiResponse.created(res, 'Pickup scheduled.', schedule);
});

// ─── GET /pickup-schedules ────────────────────────────────────────────────────
exports.getAll = asyncHandler(async (req, res) => {
  const { vendorId, status, date, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (vendorId) filter.vendor = vendorId;
  if (status)   filter.status = status;
  if (date) {
    const d = new Date(date);
    filter.pickupDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [schedules, total] = await Promise.all([
    PickupSchedule.find(filter)
      .populate('vendor', 'companyName contactPerson phone')
      .populate('vendorOrder', 'orderNumber status')
      .sort({ pickupDate: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    PickupSchedule.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Pickup schedules retrieved.', schedules, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── PATCH /pickup-schedules/:id/status ──────────────────────────────────────
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['CONFIRMED', 'PICKED_UP', 'CANCELLED'];
  if (!allowed.includes(status)) throw new AppError(`status must be one of: ${allowed.join(', ')}`, 400);

  const schedule = await PickupSchedule.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(status === 'CONFIRMED' && { confirmedAt: new Date() }),
      ...(status === 'PICKED_UP' && { pickedUpAt: new Date() }),
    },
    { new: true }
  );
  if (!schedule) throw new AppError('Pickup schedule not found.', 404);

  if (status === 'PICKED_UP') {
    await VendorOrder.findByIdAndUpdate(schedule.vendorOrder, {
      status: 'PICKED_UP',
      $push: { statusHistory: { status: 'PICKED_UP', updatedBy: req.user._id, model: 'User', note: 'Material picked up.' } },
    });
    await logOrderActivity({ masterOrder: schedule.masterOrder, vendorOrder: schedule.vendorOrder,
      actorType: 'ADMIN', actor: req.user._id, action: 'PICKED_UP', description: 'Material picked up from vendor.' });
  }

  return ApiResponse.success(res, 200, 'Pickup status updated.', schedule);
});
