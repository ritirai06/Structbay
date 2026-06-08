const mongoose = require('mongoose');

const vendorActivityLogSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  
  // Activity Details
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'profile_update',
      'password_change',
      'invoice_upload',
      'invoice_replace',
      'dispatch_update',
      'status_update',
      'document_upload',
      'document_delete',
      'order_view',
      'notification_read'
    ]
  },
  
  description: { type: String, required: true },
  
  // Related References
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
  relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorInvoice' },
  relatedDispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorDispatch' },
  relatedDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorDocument' },
  
  // Change Tracking
  changes: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  
  // Request Details
  ipAddress: String,
  userAgent: String,
  device: String,
  browser: String,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

vendorActivityLogSchema.index({ vendor: 1, createdAt: -1 });
vendorActivityLogSchema.index({ action: 1 });

module.exports = mongoose.model('VendorActivityLog', vendorActivityLogSchema);
