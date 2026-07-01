const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    location: { type: String, trim: true, default: null },
    budget: { type: Number, default: null },
    expectedCompletionDate: { type: Date, default: null },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
  }
);

projectSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

module.exports = mongoose.model('Project', projectSchema);
