const User = require('../models/User');
const StaffNotification = require('../models/StaffNotification');
const { ROLES } = require('../config/constants');

/**
 * Notify every active admin user (in-app staff inbox).
 */
async function notifyAllAdmins({ type, title, message, relatedVendorOrder, metadata }) {
  const admins = await User.find({ role: ROLES.ADMIN }).select('_id').lean();
  if (!admins.length) return [];
  const docs = admins.map((u) => ({
    user: u._id,
    type,
    title,
    message,
    relatedVendorOrder,
    metadata,
  }));
  return StaffNotification.insertMany(docs, { ordered: false });
}

module.exports = { notifyAllAdmins };
