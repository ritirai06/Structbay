const asyncHandler          = require('../utils/asyncHandler');
const ApiResponse           = require('../utils/apiResponse');
const AppError              = require('../utils/AppError');
const ReplacementRequest    = require('../models/ReplacementRequest');
const Order                 = require('../models/Order');
const { logAction }         = require('../services/auditLog.service');
const { logOrderActivity, notifyCustomer } = require('../services/order.service');

// ─── POST /replacements (customer) ───────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const { masterOrderId, vendorOrderId, reason, description, images = [] } = req.body;
  if (!['WRONG_PRODUCT', 'DAMAGED_PRODUCT'].includes(reason)) {
    throw new AppError('reason must be WRONG_PRODUCT or DAMAGED_PRODUCT.', 400);
  }

  const order = await Order.findOne({ _id: masterOrderId, customer: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);
  if (!['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(order.status)) {
    throw new AppError('Replacement can only be requested for delivered orders.', 422);
  }

  const existing = await ReplacementRequest.findOne({ masterOrder: masterOrderId, status: { $nin: ['REJECTED', 'COMPLETED'] } });
  if (existing) throw new AppError('A replacement request already exists for this order.', 409);

  const rr = await ReplacementRequest.create({
    masterOrder: masterOrderId,
    vendorOrder:  vendorOrderId || null,
    customer:     req.user._id,
    reason, description, images,
    timeline: [{ status: 'PENDING', note: 'Request submitted by customer.', byUser: req.user._id }],
  });

  await logOrderActivity({ masterOrder: masterOrderId, actorType: 'CUSTOMER', actor: req.user._id,
    action: 'REPLACEMENT_REQUESTED', description: `Reason: ${reason}` });

  return ApiResponse.created(res, 'Replacement request submitted.', rr);
});

// ─── GET /replacements (admin) ────────────────────────────────────────────────
exports.getAll = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [rrs, total] = await Promise.all([
    ReplacementRequest.find(filter)
      .populate('masterOrder', 'orderNumber status')
      .populate('customer', 'name email phone')
      .populate('vendorOrder', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    ReplacementRequest.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Replacement requests retrieved.', rrs, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// ─── GET /replacements/my (customer) ─────────────────────────────────────────
exports.getMy = asyncHandler(async (req, res) => {
  const rrs = await ReplacementRequest.find({ customer: req.user._id })
    .populate('masterOrder', 'orderNumber status')
    .sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Your replacement requests.', rrs);
});

// ─── GET /replacements/:id ────────────────────────────────────────────────────
exports.getById = asyncHandler(async (req, res) => {
  const rr = await ReplacementRequest.findById(req.params.id)
    .populate('masterOrder', 'orderNumber status customer')
    .populate('customer', 'name email phone')
    .populate('reviewedBy', 'name email');
  if (!rr) throw new AppError('Replacement request not found.', 404);
  return ApiResponse.success(res, 200, 'Replacement request retrieved.', rr);
});

// ─── PATCH /replacements/:id/review (admin) ───────────────────────────────────
exports.review = asyncHandler(async (req, res) => {
  const { decision, notes } = req.body;  // decision: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) throw new AppError('decision must be approve or reject.', 400);

  const rr = await ReplacementRequest.findById(req.params.id);
  if (!rr) throw new AppError('Replacement request not found.', 404);
  if (!['PENDING', 'UNDER_REVIEW'].includes(rr.status)) throw new AppError('Request already reviewed.', 422);

  const newStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  rr.status      = newStatus;
  rr.reviewedBy  = req.user._id;
  rr.reviewedAt  = new Date();
  rr.reviewNotes = notes;
  rr.timeline.push({ status: newStatus, note: notes || `${decision}d by admin.`, byUser: req.user._id });
  await rr.save();

  const order = await Order.findById(rr.masterOrder);
  await notifyCustomer({ customerId: rr.customer,
    title: `Replacement ${newStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
    type: 'ORDER', refId: order?.orderNumber,
    message: `Your replacement request for order ${order?.orderNumber} has been ${newStatus.toLowerCase()}.${notes ? ' Note: ' + notes : ''}` });

  await logOrderActivity({ masterOrder: rr.masterOrder, actorType: 'ADMIN', actor: req.user._id,
    action: decision === 'approve' ? 'REPLACEMENT_APPROVED' : 'REPLACEMENT_REJECTED',
    description: `Replacement ${newStatus}. Notes: ${notes}` });
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'ReplacementRequest',
    targetId: rr._id.toString(), description: `Replacement ${newStatus}.`, ipAddress: req.ip });

  return ApiResponse.success(res, 200, `Replacement request ${newStatus.toLowerCase()}.`, rr);
});
