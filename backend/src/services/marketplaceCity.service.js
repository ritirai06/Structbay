/**
 * City-scoped marketplace helpers.
 * A product is sellable in a city when it has visible city pricing and positive available inventory.
 */
const mongoose = require('mongoose');
const City = require('../models/City');
const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');

async function resolveMarketplaceCityId(cityId, cityName) {
  if (cityId && mongoose.Types.ObjectId.isValid(String(cityId))) {
    const oid = new mongoose.Types.ObjectId(String(cityId));
    const city = await City.findOne({
      _id: oid,
      status: 'ACTIVE',
      isServiceable: true,
    })
      .select('_id')
      .lean();
    if (city) return oid;
  }

  const nameHint = cityName != null ? String(cityName).trim() : '';
  if (nameHint) {
    const { normalizeCityName } = require('../utils/cityNameMatch');
    const norm = normalizeCityName(nameHint);
    const cities = await City.find({ status: 'ACTIVE', isServiceable: true })
      .select('name _id')
      .lean();
    const hit = cities.find((c) => normalizeCityName(c.name) === norm);
    if (hit) return hit._id;
  }

  return null;
}

async function getPricedProductIdsForCity(cityOid) {
  return CityPricing.distinct('product', {
    city: cityOid,
    isVisible: true,
    isDeleted: false,
  });
}

async function getSellableProductIdsForCity(cityOid) {
  const [priced, invAgg] = await Promise.all([
    getPricedProductIdsForCity(cityOid),
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

function vendorServesCity(userLean, cityOid) {
  if (!userLean || userLean.role !== 'VENDOR') return false;
  const ids = userLean.serviceCityIds;
  if (!Array.isArray(ids) || ids.length === 0) return true;
  const want = String(cityOid);
  return ids.some((id) => String(id) === want);
}

module.exports = {
  resolveMarketplaceCityId,
  getPricedProductIdsForCity,
  getSellableProductIdsForCity,
  vendorServesCity,
};
