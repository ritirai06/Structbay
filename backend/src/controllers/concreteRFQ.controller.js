const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const ConcreteRFQ = require('../models/ConcreteRFQ');
const { logAction } = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');

const genNumber = () => generateRefNumber('CONCRETE_RFQ');

const getAll = asyncHandler(async (req, res) => {
  const { status, city, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (city) filter.city = { $regex: city, $options: 'i' };
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [items, total] = await Promise.all([
    ConcreteRFQ.find(filter)
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    ConcreteRFQ.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'RFQs retrieved.', items, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const item = await ConcreteRFQ.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('assignedTo', 'name email');
  if (!item) throw new AppError('RFQ not found.', 404);
  return ApiResponse.success(res, 200, 'RFQ retrieved.', item);
});

const create = asyncHandler(async (req, res) => {
  const rfqNumber = await genNumber();
  const payload = { ...req.body, rfqNumber };
  if (req.user?._id) payload.customer = req.user._id;
  const item = await ConcreteRFQ.create(payload);
  return ApiResponse.created(res, 'RFQ submitted.', item);
});

const update = asyncHandler(async (req, res) => {
  const item = await ConcreteRFQ.findById(req.params.id);
  if (!item) throw new AppError('RFQ not found.', 404);
  const allowed = ['status', 'assignedTo', 'quotationUrl', 'adminNotes'];
  allowed.forEach(f => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  await item.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'ConcreteRFQ',
    targetId: item._id.toString(), description: `Updated RFQ: ${item.rfqNumber}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'RFQ updated.', item);
});

const getStats = asyncHandler(async (req, res) => {
  const [total, pending, inProgress, quoted, converted] = await Promise.all([
    ConcreteRFQ.countDocuments(),
    ConcreteRFQ.countDocuments({ status: 'PENDING' }),
    ConcreteRFQ.countDocuments({ status: 'IN_PROGRESS' }),
    ConcreteRFQ.countDocuments({ status: 'QUOTED' }),
    ConcreteRFQ.countDocuments({ status: 'CONVERTED' }),
  ]);
  return ApiResponse.success(res, 200, 'Stats.', { total, pending, inProgress, quoted, converted });
});

module.exports = { getAll, getById, create, update, getStats };
