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
  TRACKING:        'TRK',
  DELIVERY:        'DEL',
  FINANCE:         'FIN',
  CUSTOMER:        'CUS',
  VENDOR:          'VND',
  PRODUCT:         'PRD',
  CITY:            'CITY',
  AUDIT_LOG:       'LOG',
  /** Internal counter only — output format is PRD `YYMMDD` + 4-digit seq (no prefix). */
  MASTER_ORDER:    'MO',
};

function getDateKey(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

/** PRD master order date key: YYMMDD (e.g. 260531). */
function getDateKeyYYMMDD(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${y}${m}${d}`;
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
 * Vendor sub-order: `{masterOrderNumber}-{n}` (PRD e.g. 2605310001-1, 2605310001-2).
 */
function generateSubOrderNumber(masterOrderNumber, subIndex) {
  return `${masterOrderNumber}-${Number(subIndex)}`;
}

/**
 * Concrete RFQ reference: `RFQCON` + `YYMMDD` + 4-digit daily sequence (e.g. RFQCON2606120001).
 */
async function generateConcreteRfqNumber(options = {}) {
  const module = 'CONCRETE_RFQ';
  const prefix = 'RFQCON';
  const date = getDateKeyYYMMDD();
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

      const seq = String(counter.currentSequence).padStart(4, '0');
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
        ).catch(() => {});
      }

      return referenceNumber;
    } catch (err) {
      if (err && err.code === 11000 && attempt < maxRetries - 1) continue;
      throw err;
    }
  }

  throw new Error('Failed to allocate concrete RFQ reference');
}

async function getNextSubOrderIndex(masterOrderId) {
  const VendorOrder = require('../models/VendorOrder');
  const count = await VendorOrder.countDocuments({ masterOrder: masterOrderId });
  return count + 1;
}

/**
 * Master order number per PRD: YYMMDD + 4-digit daily sequence (e.g. 2605310001).
 * Sub-orders append `-1`, `-2`, … via {@link generateSubOrderNumber}.
 */
async function generatePrdMasterOrderNumber(options = {}) {
  const module = 'MASTER_ORDER';
  const prefix = MODULE_PREFIXES[module];
  const date = getDateKeyYYMMDD();
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

      const seq = String(counter.currentSequence).padStart(4, '0');
      const referenceNumber = `${date}${seq}`;

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
        ).catch(() => {});
      }

      return referenceNumber;
    } catch (err) {
      if (err && err.code === 11000 && attempt < maxRetries - 1) continue;
      throw err;
    }
  }

  throw new Error('Failed to allocate PRD master order number');
}

module.exports = {
  generateRefNumber,
  generatePrdMasterOrderNumber,
  generateConcreteRfqNumber,
  generateSubOrderNumber,
  getNextSubOrderIndex,
  MODULE_PREFIXES,
  getDateKey,
  getDateKeyYYMMDD,
};
