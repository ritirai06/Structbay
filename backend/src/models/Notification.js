const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:    { type: String, required: true, trim: true },
    message:  { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['ORDER', 'PAYMENT', 'DISPATCH', 'DELIVERY', 'INVOICE', 'ENQUIRY', 'RFQ', 'ANNOUNCEMENT'],
      default: 'ORDER',
    },
    refId:    { type: String, default: null },   // order number / enquiry number etc.
    isRead:   { type: Boolean, default: false },
    isDeleted:{ type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

notificationSchema.index({ customer: 1, isRead: 1, createdAt: -1 });
notificationSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });

module.exports = mongoose.model('Notification', notificationSchema);
