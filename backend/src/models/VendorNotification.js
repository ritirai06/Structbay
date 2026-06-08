const mongoose = require('mongoose');

const vendorNotificationSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  
  // Notification Details
  type: {
    type: String,
    required: true,
    enum: [
      'order_assigned',
      'invoice_requested',
      'dispatch_requested',
      'delivery_update',
      'order_status_change',
      'admin_announcement',
      'system_alert',
      'document_verified',
      'document_rejected',
      'performance_alert'
    ]
  },
  
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Related References
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
  relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorInvoice' },
  relatedDispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorDispatch' },
  
  // Priority
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  
  // Status
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  
  // Actions
  actionUrl: String,
  actionLabel: String,
  
  // Delivery Channels
  channels: {
    email: { sent: Boolean, sentAt: Date },
    sms: { sent: Boolean, sentAt: Date },
    whatsapp: { sent: Boolean, sentAt: Date },
    push: { sent: Boolean, sentAt: Date }
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

vendorNotificationSchema.index({ vendor: 1, isRead: 1 });
vendorNotificationSchema.index({ vendor: 1, type: 1 });
vendorNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorNotification', vendorNotificationSchema);
