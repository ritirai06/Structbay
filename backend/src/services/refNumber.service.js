const mongoose = require('mongoose');
const ReferenceCounter = require('../models/ReferenceCounter');
const ReferenceAllocation = require('../models/ReferenceAllocation');

/**
 * Module → Prefix map (daily sequence per module).
 * Sub-orders (vendor) use master ORD number + "-NN" — do not use a counter here.
 */
const MODULE_PREFIXES = {
  ORDER:           'ORD',
  BULK_ENQUIRY:    'BULK',
  CONCRETE_RFQ:    'RFQCON',
  RFQ:             'RFQ',
  CUSTOMER_INVOICE:'INV',
  VENDOR_INVOICE:  'VINV',
  EWAY_BILL:       'EWB',
  SHIPMENT:        'SHP',
  DELIVERY:        'DEL',
  FINANCE:         'FIN',
  CUSTOMER:        'CUS',
  VENDOR:          'VND',
  PRODUCT:         'PRD',
  CITY:            'CITY',
  AUDIT_LOG:       'LOG',
};

function getDateKey(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

/**
 * Atomically allocate the next reference for a module (daily reset via date in filter).
 * Retries on rare upsert duplicate-key races.
 *
 * @param {string} module - key from MODULE_PREFIXES
 * @param {object} [options]
 * @param {import('mongoose').ClientSession} [options.session]
 * @param {boolean} [options.skipAllocationLog]
 * @param {string} [options.entityModel]
 * @param {import('mongoose').Types.ObjectId|string} [options.entityId]
 */
async function generateRefNumber(module, options = {}) {
  const prefix = MODULE_PREFIXES[module];
  if (!prefix) throw new Error(`Unknown reference module: ${module}`);

  const date = getDateKey();
  const maxRetries = 6;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const counter = await ReferenceCounter.findOneAndUpdate(
        { module, date },
        {
          $inc: { currentSequence: 1 },
          $set: {
            prefix,
            lastGeneratedAt: new Date(),
            status: 'ACTIVE',
          },
        },
        { new: true, upsert: true, session: options.session }
      );

      const seq = String(counter.currentSequence).padStart(3, '0');
      const referenceNumber = `${prefix}${date}${seq}`;

      if (!options.skipAllocationLog) {
        await ReferenceAllocation.create(
          [{
            module,
            referenceNumber,
            dateKey: date,
            sequence: counter.currentSequence,
            entityModel: options.entityModel || null,
            entityId: options.entityId || null,
          }],
          { session: options.session }
        ).catch(() => {
          /* allocation log must not block business flow */
        });
      }

      return referenceNumber;
    } catch (err) {
      if (err && err.code === 11000 && attempt < maxRetries - 1) continue;
      throw err;
    }
  }

  throw new Error(`Failed to allocate reference for module ${module}`);
}

/**
 * Vendor sub-order: ORDDDMYY001-01 (2-digit suffix, daily master sequence in prefix).
 */
function generateSubOrderNumber(masterOrderNumber, subIndex) {
  return `${masterOrderNumber}-${String(subIndex).padStart(2, '0')}`;
}

async function getNextSubOrderIndex(masterOrderId) {
  const VendorOrder = require('../models/VendorOrder');
  const count = await VendorOrder.countDocuments({ masterOrder: masterOrderId });
  return count + 1;
}

module.exports = {
  generateRefNumber,
  generateSubOrderNumber,
  getNextSubOrderIndex,
  MODULE_PREFIXES,
  getDateKey,
};
