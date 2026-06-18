const mongoose = require('mongoose');

const staffNotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'NEW_ORDER',
        'NEW_RFQ',
        'LOW_STOCK',
        'ORDER_ASSIGNED',
        'ORDER_ACCEPTED',
        'ORDER_REJECTED',
        'READY_FOR_DISPATCH',
        'DISPATCH_APPROVED',
        'CHANGES_REQUESTED',
        'VENDOR_INVOICE_SUBMITTED',
        'SB_INVOICE_SENT',
        'ORDER_DISPATCHED',
        'ORDER_DELIVERED',
        'DELIVERY_CONFIRMED',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedVendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
    relatedMasterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    metadata: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

staffNotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
staffNotificationSchema.index({ relatedVendorOrder: 1 });

module.exports = mongoose.model('StaffNotification', staffNotificationSchema);
