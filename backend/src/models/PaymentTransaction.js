const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    amount:      { type: Number, required: true },
    currency:    { type: String, default: 'INR' },

    provider:    { type: String, default: 'zoho_payments' },
    providerTxnId:   String,
    providerOrderId: String,
    providerPaymentId: String,

    status: {
      type: String,
      enum: ['INITIATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'],
      default: 'INITIATED',
    },

    paymentMethod: String,
    paidAt:        Date,
    failureReason: String,

    refundAmount:  Number,
    refundedAt:    Date,
    refundReference: String,

    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

paymentTransactionSchema.index({ masterOrder: 1 });
paymentTransactionSchema.index({ providerTxnId: 1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
