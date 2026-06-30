const mongoose = require('mongoose');

const vendorInvoiceSchema = new mongoose.Schema({
  vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  
  // Structbay internal ref (VINV…); vendor tax invoice details optional (from PDF / future OCR)
  invoiceNumber: { type: String, required: true },
  vendorTaxInvoiceNumber: { type: String, default: null },
  invoiceDate: { type: Date, default: null },

  // Amounts — optional; extracted from PDF manually or via future OCR
  invoiceAmount: { type: Number, default: null },
  gstAmount: { type: Number, default: null },
  totalAmount: { type: Number, default: null },
  
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

  /** Snapshot at submission (Type B pickup coordination). */
  pickupContactName: String,
  pickupContactPhone: String,

  submittedAt: { type: Date, default: Date.now },
  
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
