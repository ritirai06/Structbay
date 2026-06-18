const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const CityPricing = require('../models/CityPricing');
const Inventory = require('../models/Inventory');
const City = require('../models/City');
const { reviveSoftDeleted } = require('../utils/softDeleteRelease');

function normalizeSlabs(slabs) {
  if (!Array.isArray(slabs)) return [];
  return slabs
    .map((sl) => {
      const minQty = Number(sl.minQty);
      const price = Number(sl.price);
      const maxQty = sl.maxQty === null || sl.maxQty === '' || sl.maxQty === undefined
        ? null
        : Number(sl.maxQty);
      if (!Number.isFinite(minQty) || minQty < 0) return null;
      if (!Number.isFinite(price) || price < 0) return null;
      if (maxQty != null && (!Number.isFinite(maxQty) || maxQty < minQty)) return null;
      return { minQty, maxQty, price };
    })
    .filter(Boolean);
}

function normalizeCityPricingRow(row, productGst = 18) {
  const city = row.city || row.cityId;
  if (!city || !mongoose.Types.ObjectId.isValid(String(city))) {
    throw new AppError('Each city pricing row must include a valid city id.', 400);
  }

  const sellingPrice = Number(row.sellingPrice ?? row.salePrice ?? row.regularPrice);
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    throw new AppError('sellingPrice must be a non-negative number for each city.', 400);
  }

  const mrpRaw = row.mrp ?? row.MRP;
  const mrp = mrpRaw != null && mrpRaw !== '' ? Number(mrpRaw) : sellingPrice;
  const purchaseCostRaw = row.purchaseCost ?? row.purchase_cost;
  const purchaseCost = purchaseCostRaw != null && purchaseCostRaw !== '' ? Number(purchaseCostRaw) : null;
  const deliveryCharge = Number(row.deliveryCharge ?? row.delivery_charge ?? 0);
  const taxRaw = row.taxPercentage ?? row.tax ?? row.tax_percentage;
  const taxPercentage = taxRaw != null && taxRaw !== ''
    ? Number(taxRaw)
    : (Number.isFinite(Number(productGst)) ? Number(productGst) : 18);

  const isAvailable = row.isAvailable ?? row.isVisible;
  const isVisible = isAvailable === undefined ? true : !!isAvailable;

  return {
    city: new mongoose.Types.ObjectId(String(city)),
    regularPrice: Number.isFinite(mrp) && mrp >= 0 ? mrp : sellingPrice,
    salePrice: sellingPrice,
    mrp: Number.isFinite(mrp) && mrp >= 0 ? mrp : null,
    purchaseCost: Number.isFinite(purchaseCost) && purchaseCost >= 0 ? purchaseCost : null,
    deliveryCharge: Number.isFinite(deliveryCharge) && deliveryCharge >= 0 ? deliveryCharge : 0,
    taxPercentage: Number.isFinite(taxPercentage) && taxPercentage >= 0 ? taxPercentage : null,
    wholesaleSlabs: normalizeSlabs(row.wholesaleSlabs || []),
    isVisible,
  };
}

function normalizeInventoryRow(row) {
  const city = row.city || row.cityId;
  if (!city || !mongoose.Types.ObjectId.isValid(String(city))) {
    throw new AppError('Each inventory row must include a valid city id.', 400);
  }

  const quantity = Number(row.quantity ?? row.availableStock ?? row.available_stock ?? 0);
  const reserved = Number(row.reserved ?? row.reservedStock ?? row.reserved_stock ?? 0);
  const reorderLevel = Number(row.reorderLevel ?? row.lowStockThreshold ?? row.reorder_level ?? 50);
  const safetyStock = Number(row.safetyStock ?? row.safety_stock ?? 0);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new AppError('quantity must be a non-negative number.', 400);
  }
  if (!Number.isFinite(reserved) || reserved < 0) {
    throw new AppError('reserved must be a non-negative number.', 400);
  }
  if (reserved > quantity) {
    throw new AppError('reserved stock cannot exceed available stock.', 400);
  }

  return {
    city: new mongoose.Types.ObjectId(String(city)),
    quantity,
    reserved: Number.isFinite(reserved) ? reserved : 0,
    lowStockThreshold: Number.isFinite(reorderLevel) && reorderLevel >= 0 ? reorderLevel : 50,
    safetyStock: Number.isFinite(safetyStock) && safetyStock >= 0 ? safetyStock : 0,
  };
}

async function enrichProductsSummary(products) {
  if (!products.length) return products;

  const ids = products.map((p) => p._id);
  const [pricingRows, inventoryRows] = await Promise.all([
    CityPricing.find({ product: { $in: ids }, variation: null, isVisible: true })
      .populate('city', 'name slug')
      .select('product city regularPrice salePrice mrp isVisible')
      .lean(),
    Inventory.find({ product: { $in: ids }, variation: null })
      .select('product city quantity reserved')
      .lean(),
  ]);

  const pricingByProduct = new Map();
  for (const row of pricingRows) {
    const key = String(row.product);
    if (!pricingByProduct.has(key)) pricingByProduct.set(key, []);
    pricingByProduct.get(key).push(row);
  }

  const inventoryByProduct = new Map();
  for (const row of inventoryRows) {
    const key = String(row.product);
    if (!inventoryByProduct.has(key)) inventoryByProduct.set(key, []);
    inventoryByProduct.get(key).push(row);
  }

  return products.map((p) => {
    const json = typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
    const pid = String(json._id);
    const pricing = pricingByProduct.get(pid) || [];
    const inventory = inventoryByProduct.get(pid) || [];

    const prices = pricing
      .map((pr) => pr.salePrice ?? pr.regularPrice)
      .filter((v) => Number.isFinite(v));
    const cities = pricing
      .filter((pr) => pr.isVisible !== false)
      .map((pr) => pr.city?.name)
      .filter(Boolean);

    const totalStock = inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);

    return {
      ...json,
      citiesAvailable: cities,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      highestPrice: prices.length ? Math.max(...prices) : null,
      totalStock,
      inventorySummary: {
        totalStock,
        cityCount: inventory.length,
      },
    };
  });
}

async function getProductConfiguration(productId) {
  const [cityPricing, inventory, cities] = await Promise.all([
    CityPricing.find({ product: productId, variation: null })
      .populate('city', 'name slug state status isServiceable')
      .sort({ 'city.name': 1 })
      .lean(),
    Inventory.find({ product: productId, variation: null })
      .populate('city', 'name slug state')
      .lean(),
    City.find({ status: 'ACTIVE', isServiceable: true }).select('name slug state').sort({ name: 1 }).lean(),
  ]);

  const pricingByCity = new Map(cityPricing.map((p) => [String(p.city?._id || p.city), p]));
  const inventoryByCity = new Map(inventory.map((i) => [String(i.city?._id || i.city), i]));

  const cityConfigs = cities.map((city) => {
    const cid = String(city._id);
    const pricing = pricingByCity.get(cid);
    const inv = inventoryByCity.get(cid);
    const qty = inv?.quantity ?? 0;
    const reorder = inv?.lowStockThreshold ?? 50;
    let stockStatus = 'IN_STOCK';
    if (qty === 0) stockStatus = 'OUT_OF_STOCK';
    else if (qty <= reorder) stockStatus = 'LOW_STOCK';

    return {
      city: city,
      pricing: pricing ? {
        _id: pricing._id,
        sellingPrice: pricing.salePrice ?? pricing.regularPrice,
        mrp: pricing.mrp ?? pricing.regularPrice,
        purchaseCost: pricing.purchaseCost ?? null,
        deliveryCharge: pricing.deliveryCharge ?? 0,
        taxPercentage: pricing.taxPercentage ?? null,
        isAvailable: pricing.isVisible !== false,
        wholesaleSlabs: pricing.wholesaleSlabs || [],
      } : null,
      inventory: inv ? {
        _id: inv._id,
        quantity: inv.quantity,
        reserved: inv.reserved,
        reorderLevel: inv.lowStockThreshold,
        safetyStock: inv.safetyStock ?? 0,
        stockStatus,
        available: Math.max(0, (inv.quantity || 0) - (inv.reserved || 0)),
      } : null,
    };
  });

  return { cityPricing, inventory, cityConfigs, activeCities: cities };
}

async function saveProductConfiguration(productId, { cityPricing = [], inventory = [] }, userId, session, productGst = 18) {
  const opts = session ? { session } : {};
  const productOid = new mongoose.Types.ObjectId(String(productId));

  for (const row of cityPricing) {
    const hasPrice = row.sellingPrice != null || row.salePrice != null || row.regularPrice != null;
    if (!hasPrice) continue;
    const normalized = normalizeCityPricingRow({
      ...row,
      taxPercentage: row.taxPercentage ?? productGst,
    });
    const pricingQuery = { product: productOid, city: normalized.city, variation: null };
    await reviveSoftDeleted(CityPricing, pricingQuery);
    await CityPricing.findOneAndUpdate(
      pricingQuery,
      {
        $set: {
          regularPrice: normalized.regularPrice,
          salePrice: normalized.salePrice,
          mrp: normalized.mrp,
          purchaseCost: normalized.purchaseCost,
          deliveryCharge: normalized.deliveryCharge,
          taxPercentage: normalized.taxPercentage,
          wholesaleSlabs: normalized.wholesaleSlabs,
          isVisible: normalized.isVisible,
          isDeleted: false,
          updatedBy: userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, ...opts }
    );
  }

  for (const row of inventory) {
    const normalized = normalizeInventoryRow(row);
    const inventoryQuery = { product: productOid, city: normalized.city, variation: null };
    await reviveSoftDeleted(Inventory, inventoryQuery);
    await Inventory.findOneAndUpdate(
      inventoryQuery,
      {
        $set: {
          quantity: normalized.quantity,
          reserved: normalized.reserved,
          lowStockThreshold: normalized.lowStockThreshold,
          safetyStock: normalized.safetyStock,
          isDeleted: false,
          updatedBy: userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, ...opts }
    );
  }
}

function hasNestedPayload(body) {
  return body && (body.product || body.cityPricing || body.inventory || body.wholesaleSlabs);
}

function extractNestedPayload(body, productGst) {
  const productFields = body.product && typeof body.product === 'object' ? body.product : body;
  let cityPricing = Array.isArray(body.cityPricing) ? body.cityPricing : [];

  if (Array.isArray(body.wholesaleSlabs) && body.wholesaleSlabs.length) {
    const slabsByCity = new Map();
    for (const slab of body.wholesaleSlabs) {
      const cityId = slab.city || slab.cityId;
      if (!cityId) continue;
      const key = String(cityId);
      if (!slabsByCity.has(key)) slabsByCity.set(key, []);
      slabsByCity.get(key).push(slab);
    }
    for (const [cityId, slabs] of slabsByCity) {
      const existing = cityPricing.find((r) => String(r.city || r.cityId) === cityId);
      if (existing) {
        existing.wholesaleSlabs = slabs;
      } else {
        cityPricing.push({ city: cityId, wholesaleSlabs: slabs, sellingPrice: 0 });
      }
    }
  }

  cityPricing = cityPricing.map((row) => {
    if (row.sellingPrice == null && row.taxPercentage == null && productFields.gstPercentage != null) {
      return { ...row, taxPercentage: row.taxPercentage ?? productFields.gstPercentage };
    }
    return row;
  });

  const inventory = Array.isArray(body.inventory) ? body.inventory : [];
  return { productFields, cityPricing, inventory };
}

module.exports = {
  normalizeSlabs,
  normalizeCityPricingRow,
  normalizeInventoryRow,
  enrichProductsSummary,
  getProductConfiguration,
  saveProductConfiguration,
  hasNestedPayload,
  extractNestedPayload,
};
