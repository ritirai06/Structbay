const mongoose = require('mongoose');

const bulkEnquirySchema = new mongoose.Schema(
  {
    enquiryNumber: { type: String, unique: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, default: null },
    companyName: { type: String, default: null },
    deliveryAddress: { type: String, default: null },
    city: { type: String, default: null },
    requirement: { type: String, required: true },
    remarks: { type: String, default: null },
    notes: { type: String, default: null },
    attachments: [{ name: String, url: String, publicId: String }],
    status: {
      type: String,
      enum: ['NEW', 'IN_PROGRESS', 'QUOTED', 'CONVERTED', 'CLOSED'],
      default: 'NEW',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNotes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

bulkEnquirySchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
bulkEnquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BulkEnquiry', bulkEnquirySchema);
