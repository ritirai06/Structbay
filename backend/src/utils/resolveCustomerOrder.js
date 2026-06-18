const mongoose = require('mongoose');
const Order = require('../models/Order');

function customerOrderFilter(customerId, idOrNumber) {
  const raw = String(idOrNumber || '').trim();
  if (!raw) return null;

  const isObjectId =
    mongoose.Types.ObjectId.isValid(raw) &&
    String(new mongoose.Types.ObjectId(raw)) === raw;

  return isObjectId
    ? { _id: raw, customer: customerId }
    : { orderNumber: raw, customer: customerId };
}

/** Resolve master order by Mongo id or customer-facing order number. */
async function resolveCustomerMasterOrder(customerId, idOrNumber) {
  const filter = customerOrderFilter(customerId, idOrNumber);
  if (!filter) return null;
  return Order.findOne(filter);
}

module.exports = { customerOrderFilter, resolveCustomerMasterOrder };
