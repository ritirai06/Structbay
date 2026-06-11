const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

/**
 * VendorOrder.vendor may reference the legacy Vendor document _id OR the unified User _id,
 * depending on how assignments were created. Restrict queries to IDs belonging to this user.
 */
async function vendorIdsForUser(user) {
  if (!user?._id) return [];
  const set = new Set();
  set.add(user._id.toString());
  if (user.email) {
    const v = await Vendor.findOne({ email: String(user.email).toLowerCase() }).select('_id').lean();
    if (v?._id) set.add(v._id.toString());
  }
  return [...set].map((id) => new mongoose.Types.ObjectId(id));
}

async function vendorOrderMatch(user) {
  const ids = await vendorIdsForUser(user);
  return { vendor: { $in: ids } };
}

module.exports = { vendorIdsForUser, vendorOrderMatch };
