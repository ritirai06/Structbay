const mongoose = require('mongoose');

const vendorDocumentSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  
  documentType: {
    type: String,
    required: true,
    enum: [
      'gst_certificate',
      'pan_card',
      'business_registration',
      'cancelled_cheque',
      'bank_statement',
      'compliance_certificate',
      'vendor_agreement',
      'other'
    ]
  },
  
  documentName: { type: String, required: true },
  documentUrl: { type: String, required: true },
  cloudinaryId: String,
  
  // Document Details
  documentNumber: String,
  issueDate: Date,
  expiryDate: Date,
  
  // Status
  status: { type: String, enum: ['pending', 'verified', 'rejected', 'expired'], default: 'pending' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  rejectionReason: String,
  
  // Metadata
  fileSize: Number,
  mimeType: String,
  notes: String,
  
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
}, { timestamps: true });

vendorDocumentSchema.index({ vendor: 1, documentType: 1 });
vendorDocumentSchema.index({ status: 1 });

module.exports = mongoose.model('VendorDocument', vendorDocumentSchema);
