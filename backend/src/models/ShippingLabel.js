const mongoose = require('mongoose');

const shippingLabelSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true, index: true },
    shipmentId: { type: String, required: true, unique: true },
    trackingNumber: { type: String, required: true, index: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now },
    labelUrl: { type: String, default: null },
    labelCloudinaryId: { type: String, default: null },
    barcodeValue: { type: String, required: true },
    qrValue: { type: String, required: true },
    status: {
      type: String,
      enum: ['GENERATED', 'REGENERATED', 'VOID'],
      default: 'GENERATED',
    },
    deliveryType: { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },
    labelSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    version: { type: Number, default: 1 },
    /** Vendor portal visibility — labels are admin-only until explicitly shared (Type A). */
    sharedWithVendor: { type: Boolean, default: false },
    sharedAt: { type: Date, default: null },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

shippingLabelSchema.index({ order: 1, vendorOrder: 1 }, { unique: true });

const ShippingLabel = mongoose.model('ShippingLabel', shippingLabelSchema);

module.exports = ShippingLabel;
