const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const BulkEnquiry = require('../models/BulkEnquiry');
const { logAction } = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');

const genNumber = () => generateRefNumber('BULK_ENQUIRY');

const getAll = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [items, total] = await Promise.all([
    BulkEnquiry.find(filter)
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    BulkEnquiry.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Bulk enquiries retrieved.', items, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const item = await BulkEnquiry.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('assignedTo', 'name email');
  if (!item) throw new AppError('Bulk enquiry not found.', 404);
  return ApiResponse.success(res, 200, 'Bulk enquiry retrieved.', item);
});

const create = asyncHandler(async (req, res) => {
  if (!req.body.requirement && !req.body.attachments?.length) {
    throw new AppError('Either requirement message or document attachment is required.', 400);
  }
  const enquiryNumber = await genNumber();
  const payload = { ...req.body, enquiryNumber, customer: req.user._id };
  const item = await BulkEnquiry.create(payload);
  return ApiResponse.created(res, 'Bulk enquiry submitted.', item);
});

const update = asyncHandler(async (req, res) => {
  const item = await BulkEnquiry.findById(req.params.id);
  if (!item) throw new AppError('Bulk enquiry not found.', 404);
  const allowed = ['status', 'assignedTo', 'adminNotes'];
  allowed.forEach(f => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  await item.save();
  await logAction({ adminId: req.user._id, action: 'UPDATE', module: 'BulkEnquiry',
    targetId: item._id.toString(), description: `Updated bulk enquiry: ${item.enquiryNumber}`, ipAddress: req.ip });
  return ApiResponse.success(res, 200, 'Bulk enquiry updated.', item);
});

const getStats = asyncHandler(async (req, res) => {
  const [total, newEnq, inProgress, quoted, converted] = await Promise.all([
    BulkEnquiry.countDocuments(),
    BulkEnquiry.countDocuments({ status: 'NEW' }),
    BulkEnquiry.countDocuments({ status: 'IN_PROGRESS' }),
    BulkEnquiry.countDocuments({ status: 'QUOTED' }),
    BulkEnquiry.countDocuments({ status: 'CONVERTED' }),
  ]);
  return ApiResponse.success(res, 200, 'Stats.', { total, new: newEnq, inProgress, quoted, converted });
});

module.exports = { getAll, getById, create, update, getStats };
