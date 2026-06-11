const mongoose = require('mongoose');

const vendorInvoiceSchema = new mongoose.Schema({
  vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  
  // StructBay vendor invoice ref (VINV…); vendor's tax invoice serial optional
  invoiceNumber: { type: String, required: true },
  vendorTaxInvoiceNumber: { type: String, default: null },
  invoiceDate: { type: Date, required: true },
  
  // Amounts
  invoiceAmount: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  
  // Invoice Document
  invoiceUrl: { type: String, required: true },
  cloudinaryId: String,
  
  // Status
  status: { type: String, enum: ['uploaded', 'verified', 'rejected', 'replaced'], default: 'uploaded' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  rejectionReason: String,
  
  // Remarks
  vendorRemarks: String,
  adminRemarks: String,
  
  // Metadata
  fileSize: Number,
  mimeType: String,
  
  // Replacement tracking
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorInvoice' },
  replacesInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorInvoice' },
  
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
}, { timestamps: true });

vendorInvoiceSchema.index({ vendorOrder: 1 });
vendorInvoiceSchema.index({ vendor: 1 });
vendorInvoiceSchema.index({ invoiceNumber: 1 });
vendorInvoiceSchema.index({ status: 1 });

module.exports = mongoose.model('VendorInvoice', vendorInvoiceSchema);
