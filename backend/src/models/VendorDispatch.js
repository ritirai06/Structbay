const mongoose = require('mongoose');

const vendorDispatchSchema = new mongoose.Schema({
  vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  
  // Dispatch Type
  dispatchType: { type: String, enum: ['vendor_delivery', 'structbay_pickup'], required: true },
  
  // For Vendor Delivery
  vehicleDetails: {
    vehicleNumber: String,
    vehicleType: String,
    driverName: String,
    driverPhone: String,
    driverLicense: String
  },
  
  // For Structbay Pickup
  pickupDetails: {
    pickupAddress: String,
    contactPerson: String,
    contactNumber: String,
    pickupTime: Date,
    materialReadyStatus: { type: String, enum: ['ready', 'not_ready', 'partial'], default: 'not_ready' }
  },
  
  // Dispatch Information
  dispatchDate: Date,
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  
  // Tracking
  trackingNumber: String,
  courierPartner: String,
  transporterName: String,
  lrNumber: String,
  
  // Documents
  documents: [{
    documentType: { type: String, enum: ['packing_slip', 'shipping_label', 'dispatch_note', 'quality_certificate', 'other'] },
    documentName: String,
    documentUrl: String,
    cloudinaryId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status
  status: {
    type: String,
    enum: [
      'pending',
      'ready_for_dispatch',
      'dispatched',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ],
    default: 'pending'
  },
  
  // Remarks
  dispatchRemarks: String,
  deliveryRemarks: String,
  
  // Delivery Evidence
  deliveryProof: [{
    type: { type: String, enum: ['photo', 'signature', 'pod'] },
    url: String,
    cloudinaryId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Recipient Confirmation
  receivedBy: String,
  receivedAt: Date,
  receiverSignature: String,
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'updatedByModel' },
  updatedByModel: { type: String, enum: ['Vendor', 'User'] }
}, { timestamps: true });

vendorDispatchSchema.index({ vendorOrder: 1 });
vendorDispatchSchema.index({ vendor: 1 });
vendorDispatchSchema.index({ status: 1 });

module.exports = mongoose.model('VendorDispatch', vendorDispatchSchema);
