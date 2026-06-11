const mongoose = require('mongoose');

const orderDocumentSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', default: null },

    documentType: {
      type: String,
      enum: [
        'STRUCTBAY_INVOICE',
        'VENDOR_INVOICE',
        'TAX_INVOICE',
        'EWAY_BILL',
        'DISPATCH_SLIP',
        'DELIVERY_CHALLAN',
        'POD',
        'CUSTOMER_DOCUMENT',
        'ORDER_ATTACHMENT',
      ],
      required: true,
    },

    /** StructBay document reference (INV… / EWB… / DEL…), shown on portals & PDFs */
    documentReference: { type: String, default: null, index: true },

    label:        String,
    url:          { type: String, required: true },
    cloudinaryId: String,
    mimeType:     String,
    fileSize:     Number,

    isVerified:   { type: Boolean, default: false },
    verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt:   Date,

    rejectionReason: String,
    status: {
      type: String,
      enum: ['UPLOADED', 'VERIFIED', 'REJECTED'],
      default: 'UPLOADED',
    },

    uploadedBy:       { type: mongoose.Schema.Types.ObjectId },
    uploadedByModel:  { type: String, enum: ['User', 'Vendor'], default: 'User' },
    visibleToCustomer:{ type: Boolean, default: false },
    visibleToVendor:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderDocumentSchema.index({ masterOrder: 1, documentType: 1 });
orderDocumentSchema.index({ vendorOrder: 1 });

module.exports = mongoose.model('OrderDocument', orderDocumentSchema);
