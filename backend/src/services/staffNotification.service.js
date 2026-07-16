const User = require('../models/User');
const StaffNotification = require('../models/StaffNotification');
const { ROLES } = require('../config/constants');

/**
 * Notify every active admin user (in-app staff inbox).
 */
async function notifyAllAdmins({ type, title, message, relatedVendorOrder, relatedMasterOrder, metadata }) {
  const admins = await User.find({ role: ROLES.ADMIN }).select('_id').lean();
  if (!admins.length) return [];
  const docs = admins.map((u) => ({
    user: u._id,
    type,
    title,
    message,
    relatedVendorOrder,
    relatedMasterOrder,
    metadata,
  }));
  const inserted = await StaffNotification.insertMany(docs, { ordered: false });

  try {
    const socketManager = require('../socket');
    // Notify connected admins in real time
    if (inserted && inserted.length > 0) {
      socketManager.broadcastToAdmins('notification', inserted[0]);
    }
  } catch (err) {
    // Ignore socket error
  }

  return inserted;
}

module.exports = { notifyAllAdmins };
