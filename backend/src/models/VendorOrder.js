const mongoose = require('mongoose');

const subOrderItemSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation:   { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    masterItemId:{ type: mongoose.Schema.Types.ObjectId },
    productName: { type: String, required: true },
    sku:         String,
    quantity:    { type: Number, required: true },
    unitPrice:   { type: Number, required: true },
    gstPercentage:{ type: Number, default: 18 },
    lineTotal:   { type: Number, required: true },
  },
  { _id: true }
);

const vendorOrderSchema = new mongoose.Schema(
  {
    masterOrder:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber:  { type: String, required: true, unique: true }, // e.g. 2606120001-1
    subOrderIndex:{ type: Number, required: true },

    vendor:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt:   { type: Date, default: Date.now },
    assignmentNotes: String,

    items:        [subOrderItemSchema],

    // Limited customer info shown to vendor
    customerInfo: {
      name:  String,
      phone: String,
    },
    deliveryAddress: {
      line1: String, line2: String,
      city: String, state: String, pincode: String,
      contactPerson: String, contactPhone: String,
    },

    deliveryType: { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },

    status: {
      type: String,
      enum: [
        'ASSIGNED',
        'READY_FOR_DISPATCH',
        'INVOICE_UPLOADED',
        'DISPATCH_CONFIRMED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'ASSIGNED',
    },

    statusHistory: [
      {
        status:       String,
        updatedBy:    { type: mongoose.Schema.Types.ObjectId, refPath: 'statusHistory.model' },
        model:        { type: String, enum: ['User', 'Vendor'] },
        note:         String,
        timestamp:    { type: Date, default: Date.now },
      },
    ],

    invoiceStatus: { type: String, enum: ['PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    dispatchStatus:{ type: String, enum: ['PENDING', 'READY', 'DISPATCHED', 'DELIVERED'], default: 'PENDING' },

    expectedDispatchDate:  Date,
    expectedDeliveryDate:  Date,
    actualDispatchDate:    Date,
    actualDeliveryDate:    Date,

    totalAmount:  { type: Number, required: true },
    priority:     { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    adminNotes:   String,
    dispatchInstructions: String,
  },
  { timestamps: true }
);

vendorOrderSchema.index({ vendor: 1, status: 1 });
vendorOrderSchema.index({ orderNumber: 1 });
vendorOrderSchema.index({ masterOrder: 1 });
vendorOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorOrder', vendorOrderSchema);
