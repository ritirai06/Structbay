const mongoose = require('mongoose');

const concreteRFQSchema = new mongoose.Schema(
  {
    rfqNumber: { type: String, unique: true, required: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true },
    companyName: { type: String, default: null },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, default: null },

    rfqType: { type: String, enum: ['CONCRETE', 'SAND_AGGREGATES'], default: 'CONCRETE' },
    grade: { type: String, default: null },      // M20, M25, etc., or category name
    floorLevel: { type: String, default: null },  // Ground Floor, 1st Floor etc.
    quantity: { type: Number, default: null },   // cubic meters or MT
    quantityUnit: { type: String, default: 'm³' }, // m³ or MT
    deliveryDate: { type: Date, default: null },
    pumpRequired: { type: Boolean, default: false },
    location: { type: String, required: true },
    city: { type: String, required: true },
    notes: { type: String, default: null },

    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'QUOTED', 'CONVERTED', 'CANCELLED'],
      default: 'PENDING',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    quotationUrl: { type: String, default: null },
    adminNotes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

concreteRFQSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
concreteRFQSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ConcreteRFQ', concreteRFQSchema);
