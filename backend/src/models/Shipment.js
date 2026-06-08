const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: { type: String, unique: true, sparse: true }, // SHP...
    masterOrder:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendorOrder:  { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },

    logisticsPartner: {
      type: String,
      enum: ['porter', 'delhivery', 'manual', 'custom'],
      required: true,
    },
    customPartnerName: String,

    // Driver & Vehicle
    driverName:   String,
    driverPhone:  String,
    vehicleNumber:String,
    vehicleType:  String,

    trackingNumber:  String,
    trackingUrl:     String,
    externalShipmentId: String,

    status: {
      type: String,
      enum: [
        'CREATED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED_DELIVERY',
        'RETURNED',
        'CANCELLED',
      ],
      default: 'CREATED',
    },

    timeline: [
      {
        status:      String,
        description: String,
        location:    String,
        timestamp:   { type: Date, default: Date.now },
        updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    deliveryNotes: [
      {
        note:      { type: String, required: true },
        addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        visibleToCustomer: { type: Boolean, default: true },
        addedAt:   { type: Date, default: Date.now },
      },
    ],

    estimatedDelivery: Date,
    actualDelivery:    Date,

    // Proof of delivery
    pod: [
      {
        type:         { type: String, enum: ['photo', 'signature', 'pod'] },
        url:          String,
        cloudinaryId: String,
        uploadedAt:   { type: Date, default: Date.now },
      },
    ],

    receivedBy:   String,
    receivedAt:   Date,
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

shipmentSchema.index({ masterOrder: 1 });
shipmentSchema.index({ vendorOrder: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ trackingNumber: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
