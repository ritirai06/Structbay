const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label:       { type: String, trim: true, default: 'Home' }, // Home, Office, Site
    name:        { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: null },
    phone:       { type: String, required: true, trim: true },
    email:       { type: String, trim: true, lowercase: true, default: null },
    gstNumber:   { type: String, trim: true, uppercase: true, default: null },
    line1:       { type: String, required: true, trim: true },
    line2:       { type: String, trim: true, default: null },
    landmark:    { type: String, trim: true, default: null },
    city:        { type: String, required: true, trim: true },
    state:       { type: String, required: true, trim: true },
    pincode:     { type: String, required: true, trim: true },
    isDefault:   { type: Boolean, default: false },
    isDeleted:   { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

addressSchema.index({ customer: 1 });
addressSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });

module.exports = mongoose.model('Address', addressSchema);
