const mongoose = require('mongoose');

const vendorAssignmentSchema = new mongoose.Schema(
  {
    masterOrder:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendorOrder:  { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
    vendor:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Items assigned to this vendor from master order
    assignedItems: [
      {
        orderItemId: { type: mongoose.Schema.Types.ObjectId },
        product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity:    Number,
        unitPrice:   Number,
      },
    ],

    deliveryType:  { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },
    city:          { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    notes:         String,

    status:        { type: String, enum: ['active', 'reassigned', 'cancelled'], default: 'active' },

    history: [
      {
        action:    String, // assigned | reassigned | cancelled
        vendor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        byAdmin:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note:      String,
        at:        { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

vendorAssignmentSchema.index({ masterOrder: 1 });
vendorAssignmentSchema.index({ vendor: 1, status: 1 });

module.exports = mongoose.model('VendorAssignment', vendorAssignmentSchema);
