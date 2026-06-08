const mongoose = require('mongoose');

const vendorAttachmentSchema = new mongoose.Schema({
  vendor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },

  // Who uploaded it
  uploadedBy:      { type: mongoose.Schema.Types.ObjectId, required: true },
  uploadedByModel: { type: String, enum: ['User', 'Vendor'], required: true },

  // File details
  attachmentType: {
    type: String,
    required: true,
    enum: [
      'invoice', 'packing_slip', 'shipping_label',
      'dispatch_note', 'quality_certificate',
      'delivery_photo', 'pod', 'eway_bill',
      'customer_requirement', 'order_attachment', 'other',
    ],
  },

  // Visibility
  sharedBy: { type: String, enum: ['vendor', 'admin'], required: true },

  fileName:    { type: String, required: true },
  fileUrl:     { type: String, required: true },
  cloudinaryId:String,
  fileSize:    Number,
  mimeType:    String,
  notes:       String,

}, { timestamps: true });

vendorAttachmentSchema.index({ vendor: 1, vendorOrder: 1 });
vendorAttachmentSchema.index({ sharedBy: 1 });

module.exports = mongoose.model('VendorAttachment', vendorAttachmentSchema);
