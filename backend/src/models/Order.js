const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    name: { type: String, required: true },
    sku: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    gstPercentage: { type: Number, default: 18 },
    lineTotal: { type: Number, required: true },
    vendorAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true }
);

const addressSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    items: [orderItemSchema],

    shippingAddress: addressSchema,

    subtotal: { type: Number, required: true },
    gstTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'PENDING',
    },

    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    paymentMethod: { type: String, default: null },

    assignedVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    invoiceUrl: { type: String, default: null },
    ewayBillUrl: { type: String, default: null },

    notes: { type: String, default: null },
    adminNotes: { type: String, default: null },

    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        note: String,
      },
    ],

    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

orderSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ assignedVendor: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
