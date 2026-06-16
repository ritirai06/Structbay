const mongoose = require('mongoose');

/** Audit trail for vendor sub-order workflow (maps to spec order_status_history on vendor order). */
const vendorOrderStatusAuditSchema = new mongoose.Schema(
  {
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true, index: true },
    status: { type: String, required: true },
    remarks: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'changedByModel' },
    changedByModel: { type: String, enum: ['User', 'Vendor'], required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

vendorOrderStatusAuditSchema.index({ vendorOrder: 1, changedAt: -1 });

module.exports = mongoose.model('VendorOrderStatusAudit', vendorOrderStatusAuditSchema);
