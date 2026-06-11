const Order              = require('../models/Order');
const VendorOrder        = require('../models/VendorOrder');
const Notification       = require('../models/Notification');
const OrderActivityLog   = require('../models/OrderActivityLog');
const Inventory          = require('../models/Inventory');
const InventoryLog       = require('../models/InventoryLog');
const { sendEmail }      = require('./email.service');

// ─── Order Number Generation ──────────────────────────────────────────────────
const pad4 = (n) => String(n).padStart(4, '0');

const generateMasterOrderNumber = async () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `${yy}${mm}${dd}`;

  // Count orders created today to determine sequence
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const count = await Order.countDocuments({ createdAt: { $gte: startOfDay } });
  return `${prefix}${pad4(count + 1)}`;
};

const generateSubOrderNumber = (masterOrderNumber, index) =>
  `${masterOrderNumber}-${index}`;

// ─── Activity Log ─────────────────────────────────────────────────────────────
const logOrderActivity = async ({
  masterOrder, vendorOrder = null,
  actorType, actor,
  action, description,
  oldValue = null, newValue = null,
  ipAddress = null,
}) => {
  try {
    await OrderActivityLog.create({
      masterOrder, vendorOrder, actorType, actor,
      action, description, oldValue, newValue, ipAddress,
    });
  } catch { /* never break main flow */ }
};

// ─── Customer Notifications ───────────────────────────────────────────────────
const notifyCustomer = async ({ customerId, title, message, type = 'ORDER', refId }) => {
  try {
    await Notification.create({ customer: customerId, title, message, type, refId });
  } catch { /* silent */ }
};

// ─── Inventory Reservation ────────────────────────────────────────────────────
const reserveInventory = async (items, cityId) => {
  for (const item of items) {
    const q = { product: item.product, city: cityId };
    if (item.variation) q.variation = item.variation;
    await Inventory.findOneAndUpdate(q, { $inc: { reserved: item.quantity } });
  }
};

const releaseInventory = async (items, cityId) => {
  for (const item of items) {
    const q = { product: item.product, city: cityId };
    if (item.variation) q.variation = item.variation;
    const inv = await Inventory.findOneAndUpdate(
      q,
      { $inc: { reserved: -item.quantity } },
      { new: true }
    );
    if (inv) {
      await InventoryLog.create({
        inventory: inv._id,
        product: item.product,
        city: cityId,
        type: 'RELEASED',
        quantity: item.quantity,
        quantityBefore: inv.reserved + item.quantity,
        quantityAfter: inv.reserved,
        reason: 'Order cancelled / inventory released',
        referenceId: null,
        performedBy: null,
      }).catch(() => {});
    }
  }
};

const deductInventory = async (items, cityId, orderId, performedBy) => {
  for (const item of items) {
    const q = { product: item.product, city: cityId };
    if (item.variation) q.variation = item.variation;
    const inv = await Inventory.findOne(q);
    if (!inv) continue;
    const before = inv.quantity;
    inv.quantity  = Math.max(0, inv.quantity - item.quantity);
    inv.reserved  = Math.max(0, inv.reserved - item.quantity);
    await inv.save();
    await InventoryLog.create({
      inventory: inv._id,
      product: item.product,
      city: cityId,
      type: 'DEDUCT',
      quantity: -item.quantity,
      quantityBefore: before,
      quantityAfter: inv.quantity,
      reason: 'Order delivered',
      referenceId: orderId?.toString(),
      performedBy,
    }).catch(() => {});
  }
};

module.exports = {
  generateMasterOrderNumber,
  generateSubOrderNumber,
  logOrderActivity,
  notifyCustomer,
  reserveInventory,
  releaseInventory,
  deductInventory,
};
