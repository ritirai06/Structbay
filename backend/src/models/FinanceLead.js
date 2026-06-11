const mongoose = require('mongoose');

const financeLeadSchema = new mongoose.Schema(
  {
    // Applicant Info
    financeNumber: { type: String, unique: true, sparse: true }, // FIN...
    name:          { type: String, required: true, trim: true },
    companyName:   { type: String, trim: true },
    mobile:        { type: String, required: true, trim: true },
    email:         { type: String, trim: true, lowercase: true },
    gstNumber:     { type: String, trim: true, uppercase: true },

    businessType: {
      type: String,
      enum: ['proprietorship', 'partnership', 'pvtltd', 'llp', 'other'],
    },
    projectType:     { type: String, trim: true },
    projectLocation: { type: String, trim: true },

    loanAmountRequired: { type: Number },
    purposeOfLoan:      { type: String, trim: true },
    monthlyTurnover:    { type: Number },
    remarks:            { type: String, trim: true },

    // Linked customer (if registered)
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Documents (Cloudinary refs)
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FinanceDocument' }],

    status: {
      type: String,
      enum: ['NEW', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED'],
      default: 'NEW',
    },

    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    internalNotes: { type: String, trim: true },

    statusHistory: [
      {
        status:    String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note:      String,
        changedAt: { type: Date, default: Date.now },
      },
    ],

    disbursedAmount: { type: Number, default: null },
    disbursedAt:     { type: Date, default: null },

    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

financeLeadSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
financeLeadSchema.index({ status: 1, createdAt: -1 });
financeLeadSchema.index({ assignedTo: 1, status: 1 });
financeLeadSchema.index({ mobile: 1 });

module.exports = mongoose.model('FinanceLead', financeLeadSchema);
