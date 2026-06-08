const VendorNotification = require('../models/VendorNotification');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get Vendor Notifications
// @route   GET /api/v1/vendor/notifications
exports.getNotifications = async (req, res) => {
  const { filter = 'all', page = 1, limit = 20 } = req.query;
  const query = { vendor: req.user._id };

  if (filter === 'unread')   query.isRead    = false;
  if (filter === 'read')     query.isRead    = true;
  if (filter === 'archived') query.isArchived = true;
  else                       query.isArchived = false; // default: not archived

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    VendorNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    VendorNotification.countDocuments(query),
    VendorNotification.countDocuments({ vendor: req.user._id, isRead: false, isArchived: false }),
  ]);

  return ApiResponse.success(res, 200, 'Notifications retrieved.', { notifications, unreadCount }, {
    page: parseInt(page), limit: parseInt(limit), total,
    pages: Math.ceil(total / parseInt(limit)),
  });
};

// @desc    Mark Single Notification Read
// @route   PUT /api/v1/vendor/notifications/:id/read
exports.markRead = async (req, res) => {
  const notif = await VendorNotification.findOneAndUpdate(
    { _id: req.params.id, vendor: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notif) return ApiResponse.notFound(res, 'Notification not found.');

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'notification_read',
    description: 'Notification marked as read',
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Notification marked as read.', notif);
};

// @desc    Mark All Notifications Read
// @route   PUT /api/v1/vendor/notifications/read-all
exports.markAllRead = async (req, res) => {
  await VendorNotification.updateMany(
    { vendor: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return ApiResponse.success(res, 200, 'All notifications marked as read.');
};

// @desc    Archive Notification
// @route   PUT /api/v1/vendor/notifications/:id/archive
exports.archiveNotification = async (req, res) => {
  const notif = await VendorNotification.findOneAndUpdate(
    { _id: req.params.id, vendor: req.user._id },
    { isArchived: true, archivedAt: new Date() },
    { new: true }
  );
  if (!notif) return ApiResponse.notFound(res, 'Notification not found.');
  return ApiResponse.success(res, 200, 'Notification archived.', notif);
};
