const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const StaffNotification = require('../models/StaffNotification');

exports.listMine = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 30);
  const skip = (page - 1) * limit;
  const q = { user: req.user._id };
  const [rows, total] = await Promise.all([
    StaffNotification.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    StaffNotification.countDocuments(q),
  ]);
  return ApiResponse.success(res, 200, 'Staff notifications retrieved.', rows, {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  });
});

exports.markRead = asyncHandler(async (req, res) => {
  const n = await StaffNotification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!n) throw new AppError('Notification not found.', 404);
  return ApiResponse.success(res, 200, 'Notification marked read.', n);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await StaffNotification.updateMany({ user: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  return ApiResponse.success(res, 200, 'All notifications marked read.');
});
