const mongoose = require('mongoose');

const orderActivityLogSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', default: null },

    actorType:  { type: String, enum: ['ADMIN', 'CUSTOMER', 'VENDOR', 'SYSTEM'], required: true },
    actor:      { type: mongoose.Schema.Types.ObjectId },

    action: {
      type: String,
      enum: [
        'ORDER_PLACED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'ORDER_SPLIT',
        'VENDOR_ASSIGNED', 'VENDOR_REASSIGNED', 'VENDOR_REMOVED',
        'STATUS_CHANGED', 'PAYMENT_UPDATED',
        'INVOICE_UPLOADED', 'INVOICE_VERIFIED', 'INVOICE_REJECTED',
        'EWAY_BILL_UPLOADED', 'DOCUMENT_UPLOADED',
        'DISPATCH_CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP',
        'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_CONFIRMED',
        'REPLACEMENT_REQUESTED', 'REPLACEMENT_APPROVED', 'REPLACEMENT_REJECTED',
        'NOTE_ADDED', 'CHAT_MESSAGE',
      ],
      required: true,
    },

    description: String,
    oldValue:    mongoose.Schema.Types.Mixed,
    newValue:    mongoose.Schema.Types.Mixed,
    ipAddress:   String,
  },
  { timestamps: true }
);

orderActivityLogSchema.index({ masterOrder: 1, createdAt: -1 });
orderActivityLogSchema.index({ actor: 1 });
orderActivityLogSchema.index({ action: 1 });

module.exports = mongoose.model('OrderActivityLog', orderActivityLogSchema);
