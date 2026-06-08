const mongoose = require('mongoose');

const financeDocumentSchema = new mongoose.Schema(
  {
    financeLead: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceLead', required: true },

    documentType: {
      type: String,
      enum: ['GST_CERTIFICATE', 'BANK_STATEMENT', 'ITR', 'BUSINESS_REGISTRATION', 'PROJECT_DOCUMENT', 'IDENTITY_PROOF', 'OTHER'],
      required: true,
    },
    label:        { type: String, trim: true },
    url:          { type: String, required: true },
    cloudinaryId: { type: String },
    mimeType:     String,
    fileSize:     Number,

    uploadedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedByModel: { type: String, enum: ['User'], default: 'User' },

    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

financeDocumentSchema.index({ financeLead: 1 });
module.exports = mongoose.model('FinanceDocument', financeDocumentSchema);
