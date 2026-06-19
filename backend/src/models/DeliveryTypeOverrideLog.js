const mongoose = require('mongoose');

const deliveryTypeOverrideLogSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    masterItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', default: null },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productName: { type: String, trim: true, default: '' },
    oldType: { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },
    newType: { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },
    reason: { type: String, trim: true, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

deliveryTypeOverrideLogSchema.index({ masterOrder: 1, createdAt: -1 });

module.exports = mongoose.model('DeliveryTypeOverrideLog', deliveryTypeOverrideLogSchema);
