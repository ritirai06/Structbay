const mongoose = require('mongoose');

const zohoSyncLogSchema = new mongoose.Schema(
  {
    module:     { type: String, enum: ['BOOKS', 'INVENTORY', 'PAYMENTS', 'CRM'], required: true },
    operation:  {
      type: String,
      enum: [
        'CREATE_CUSTOMER', 'CREATE_INVOICE', 'CREATE_CREDIT_NOTE',
        'CREATE_PAYMENT', 'SYNC_PRODUCT', 'SYNC_ORDER', 'SYNC_INVENTORY',
        'SYNC_SHIPMENT', 'WEBHOOK_RECEIVED',
      ],
      required: true,
    },
    status:     { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'SKIPPED'], default: 'PENDING' },

    referenceId:    String,   // StructBay internal ID (order._id, product._id)
    zohoId:         String,   // Zoho entity ID returned
    zohoEntity:     String,   // 'invoice' | 'customer' | 'item' etc.

    requestPayload:  mongoose.Schema.Types.Mixed,
    responsePayload: mongoose.Schema.Types.Mixed,
    errorMessage:    String,

    retryCount: { type: Number, default: 0 },
    nextRetryAt: Date,
  },
  { timestamps: true }
);

zohoSyncLogSchema.index({ module: 1, status: 1, createdAt: -1 });
zohoSyncLogSchema.index({ referenceId: 1 });
module.exports = mongoose.model('ZohoSyncLog', zohoSyncLogSchema);
