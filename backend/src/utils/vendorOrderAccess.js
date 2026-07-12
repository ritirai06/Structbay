const Vendor = require('../models/Vendor');
const { isValidId } = require('../lib/apiShape');
const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');

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
  return [...set].map((id) => String(id));
}

/**
 * Match VendorOrder documents this vendor user may access.
 *
 * Includes:
 * - `vendor` in (User id + legacy Vendor id with same email as User) — normal path.
 * - Any sub-order id listed on a master order where `assignedVendor` is this User (fixes cases
 *   where admin set master.assignedVendor to the vendor User but VendorOrder.vendor still holds
 *   a legacy Vendor ObjectId from an older assignment flow, so the row was invisible in portal).
 */
async function vendorOrderMatch(user) {
  const ids = await vendorIdsForUser(user);
  return { vendor: { $in: ids } };
}

module.exports = { vendorIdsForUser, vendorOrderMatch };
