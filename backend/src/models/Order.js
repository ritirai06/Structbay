const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation:     { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    name:          { type: String, required: true },
    sku:           { type: String, default: null },
    quantity:      { type: Number, required: true, min: 1 },
    unitPrice:     { type: Number, required: true },
    gstPercentage: { type: Number, default: 18 },
    gstAmount:     { type: Number, default: 0 },
    lineTotal:     { type: Number, required: true },
    // Vendor assignment per item (set after order placement)
    assignedVendor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    vendorAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorAssignment', default: null },
    vendorOrderId:      { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', default: null },
  },
  { _id: true }
);

const addressSnapshot = new mongoose.Schema(
  {
    name: String, phone: String,
    line1: String, line2: String,
    city: String, state: String, pincode: String,
  },
  { _id: false }
);

const statusHistoryEntry = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note:      { type: String, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    city:     { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    items: [orderItemSchema],

    shippingAddress: addressSnapshot,

    subtotal:   { type: Number, required: true },
    gstTotal:   { type: Number, default: 0 },
    discount:   { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        'PENDING',
        'PAID',
        'VENDOR_ASSIGNMENT_PENDING',
        'PROCESSING',
        'READY_FOR_DISPATCH',
        'PARTIALLY_DISPATCHED',
        'DISPATCHED',
        'PARTIALLY_DELIVERED',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
        'RETURNED',
      ],
      default: 'PENDING',
    },

    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'], default: 'PENDING' },
    paymentMethod: { type: String, default: null },
    paymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction', default: null },

    // Multi-vendor sub-orders
    vendorOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' }],

    // Documents
    structbayInvoiceUrl: { type: String, default: null },
    ewayBillUrl:         { type: String, default: null },
    invoiceUrl:          { type: String, default: null }, // backward compat

    notes:      { type: String, default: null },
    adminNotes: { type: String, default: null },

    statusHistory:  [statusHistoryEntry],
    isSplit:        { type: Boolean, default: false },
    splitFromOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; },
    },
  }
);

orderSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ city: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
