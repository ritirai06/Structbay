const asyncHandler  = require('../utils/asyncHandler');
const ApiResponse   = require('../utils/apiResponse');
const AppError      = require('../utils/AppError');
const Notification  = require('../models/Notification');

// GET /customer/notifications
exports.getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { customer: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Notification.countDocuments(filter),
    Notification.countDocuments({ customer: req.user._id, isRead: false }),
  ]);

  return ApiResponse.success(res, 200, 'Notifications retrieved.', { items, unreadCount }, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// PATCH /customer/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!n) throw new AppError('Notification not found.', 404);
  return ApiResponse.success(res, 200, 'Marked as read.', n);
});

// PATCH /customer/notifications/mark-all-read
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ customer: req.user._id, isRead: false }, { isRead: true });
  return ApiResponse.success(res, 200, 'All notifications marked as read.');
});

// DELETE /customer/notifications/:id
exports.remove = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isDeleted: true },
    { new: true }
  );
  if (!n) throw new AppError('Notification not found.', 404);
  return ApiResponse.success(res, 200, 'Notification deleted.');
});
