const mongoose = require('mongoose');

const pickupScheduleSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },
    vendor:      { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    pickupDate:     { type: Date, required: true },
    pickupTime:     { type: String, required: true },
    pickupLocation: { type: String, required: true },
    contactPerson:  { type: String, required: true },
    contactNumber:  { type: String, required: true },

    logisticsPartner:  String,
    driverName:        String,
    driverPhone:       String,
    vehicleNumber:     String,

    remarks:    String,
    status:     {
      type: String,
      enum: ['SCHEDULED', 'CONFIRMED', 'PICKED_UP', 'CANCELLED'],
      default: 'SCHEDULED',
    },

    confirmedAt: Date,
    pickedUpAt:  Date,
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

pickupScheduleSchema.index({ masterOrder: 1 });
pickupScheduleSchema.index({ vendorOrder: 1 });
pickupScheduleSchema.index({ vendor: 1, pickupDate: 1 });

module.exports = mongoose.model('PickupSchedule', pickupScheduleSchema);
