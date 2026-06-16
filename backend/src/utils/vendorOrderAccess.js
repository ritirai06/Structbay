const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
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
  return [...set].map((id) => new mongoose.Types.ObjectId(id));
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
  const byVendorField = { vendor: { $in: ids } };

  if (!user?._id) return byVendorField;

  const masters = await Order.find({ assignedVendor: user._id })
    .select('vendorOrders')
    .lean();

  const voIds = new Set();
  const mastersNeedingFallback = [];
  for (const m of masters || []) {
    const explicit = (m.vendorOrders || []).map((x) => String(x)).filter(Boolean);
    if (explicit.length) {
      explicit.forEach((id) => voIds.add(id));
    } else {
      mastersNeedingFallback.push(m._id);
    }
  }

  if (mastersNeedingFallback.length) {
    const allVo = await VendorOrder.find({ masterOrder: { $in: mastersNeedingFallback } })
      .select('_id masterOrder vendor')
      .lean();
    const idStr = new Set(ids.map((id) => String(id)));
    const byMaster = new Map();
    for (const vo of allVo) {
      const k = String(vo.masterOrder);
      if (!byMaster.has(k)) byMaster.set(k, []);
      byMaster.get(k).push(vo);
    }
    for (const mid of mastersNeedingFallback) {
      const list = byMaster.get(String(mid)) || [];
      for (const vo of list) {
        if (idStr.has(String(vo.vendor))) voIds.add(String(vo._id));
      }
      if (list.length === 1 && user?._id) {
        voIds.add(String(list[0]._id));
      }
    }
  }

  const voOidList = [...voIds]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!voOidList.length) return byVendorField;

  return {
    $or: [
      byVendorField,
      { _id: { $in: voOidList } },
    ],
  };
}

module.exports = { vendorIdsForUser, vendorOrderMatch };
