/**
 * City-scoped marketplace helpers (P0).
 * A product is "sellable" in a city when it has visible city pricing AND positive available inventory in that city.
 */
const mongoose = require('mongoose');
const City = require('../models/City');
const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');

/**
 * @param {string|undefined} cityId
 * @returns {Promise<import('mongoose').Types.ObjectId|null>}
 */
async function resolveMarketplaceCityId(cityId) {
  if (!cityId || !mongoose.Types.ObjectId.isValid(String(cityId))) return null;
  const oid = new mongoose.Types.ObjectId(String(cityId));
  const city = await City.findOne({
    _id: oid,
    status: 'ACTIVE',
    isServiceable: true,
  })
    .select('_id')
    .lean();
  return city ? oid : null;
}

/**
 * Product IDs that have at least one visible CityPricing row in the city,
 * AND at least one Inventory row in the city with (quantity - reserved) > 0.
 * @param {import('mongoose').Types.ObjectId} cityOid
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
async function getSellableProductIdsForCity(cityOid) {
  const [priced, invAgg] = await Promise.all([
    CityPricing.distinct('product', {
      city: cityOid,
      isVisible: true,
      isDeleted: false,
    }),
    Inventory.aggregate([
      { $match: { city: cityOid, isDeleted: false } },
      { $addFields: { available: { $subtract: ['$quantity', '$reserved'] } } },
      { $match: { available: { $gt: 0 } } },
      { $group: { _id: '$product' } },
    ]),
  ]);

  const stocked = new Set(invAgg.map((x) => String(x._id)));
  return priced.filter((pid) => stocked.has(String(pid)));
}

/**
 * Vendors with explicit service cities must include the city; empty list = legacy (serve all cities).
 * @param {{ role?: string, serviceCityIds?: unknown[] }} userLean
 * @param {import('mongoose').Types.ObjectId} cityOid
 */
function vendorServesCity(userLean, cityOid) {
  if (!userLean || userLean.role !== 'VENDOR') return false;
  const ids = userLean.serviceCityIds;
  if (!Array.isArray(ids) || ids.length === 0) return true;
  const want = String(cityOid);
  return ids.some((id) => String(id) === want);
}

module.exports = {
  resolveMarketplaceCityId,
  getSellableProductIdsForCity,
  vendorServesCity,
};
