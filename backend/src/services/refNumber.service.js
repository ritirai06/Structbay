const ReferenceCounter = require('../models/ReferenceCounter');

/**
 * Module → Prefix map
 * All StructBay reference number formats defined here.
 */
const MODULE_PREFIXES = {
  ORDER:          'ORD',
  VENDOR_ORDER:   'ORD',       // sub-order uses master + suffix
  BULK_ENQUIRY:   'BULK',
  CONCRETE_RFQ:   'RFQCON',
  RFQ:            'RFQ',
  CUSTOMER_INVOICE:'INV',
  VENDOR_INVOICE: 'VINV',
  EWAY_BILL:      'EWB',
  SHIPMENT:       'SHP',
  DELIVERY:       'DEL',
  FINANCE:        'FIN',
  CUSTOMER:       'CUS',
  VENDOR:         'VND',
  PRODUCT:        'PRD',
  CITY:           'CITY',
  AUDIT_LOG:      'LOG',
};

/**
 * Get today's date string in DDMMYY format
 */
function getDateKey(date = new Date()) {
  const d  = String(date.getDate()).padStart(2, '0');
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const y  = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

/**
 * Generate next reference number for a module.
 * Uses findOneAndUpdate with $inc for atomic, concurrent-safe increment.
 *
 * @param {string} module  - Key from MODULE_PREFIXES
 * @returns {string}       - e.g. "ORD080626001"
 */
async function generateRefNumber(module) {
  const prefix = MODULE_PREFIXES[module];
  if (!prefix) throw new Error(`Unknown module: ${module}`);

  const date = getDateKey();

  const counter = await ReferenceCounter.findOneAndUpdate(
    { module, date },
    {
      $inc: { currentSequence: 1 },
      $set: { prefix, lastGeneratedAt: new Date() },
    },
    { new: true, upsert: true }
  );

  const seq = String(counter.currentSequence).padStart(3, '0');
  return `${prefix}${date}${seq}`;
}

/**
 * Generate vendor sub-order number from master order number.
 * e.g. masterOrderNumber = "ORD080626001", subIndex = 1 → "ORD080626001-01"
 *
 * @param {string} masterOrderNumber
 * @param {number} subIndex  - 1-based
 */
function generateSubOrderNumber(masterOrderNumber, subIndex) {
  return `${masterOrderNumber}-${String(subIndex).padStart(2, '0')}`;
}

/**
 * Get next sub-order index for a master order.
 * Counts existing VendorOrder docs for that master order.
 *
 * @param {string|ObjectId} masterOrderId
 */
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
