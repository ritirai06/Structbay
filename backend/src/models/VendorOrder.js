const mongoose = require('mongoose');

const subOrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    masterItemId: { type: mongoose.Schema.Types.ObjectId },
    productName: { type: String, required: true },
    sku: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    gstPercentage: { type: Number, default: 18 },
    lineTotal: { type: Number, required: true },
  },
  { _id: true }
);

const vendorOrderSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true, unique: true },
    subOrderIndex: { type: Number, required: true },

    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    assignmentNotes: String,

    items: [subOrderItemSchema],

    customerInfo: {
      name: String,
      phone: String,
    },
    deliveryAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      contactPerson: String,
      contactPhone: String,
    },

    deliveryType: { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },

    status: {
      type: String,
      enum: [
        'NEW_ASSIGNED',
        'ACCEPTED',
        'REJECTED',
        'READY_FOR_DISPATCH',
        'CHANGES_REQUESTED',
        'DISPATCH_APPROVED',
        'VENDOR_INVOICE_SUBMITTED',
        'SB_INVOICE_SENT',
        'DISPATCHED',
        'DELIVERED',
        'COMPLETED',
        'ASSIGNED',
        'INVOICE_UPLOADED',
        'DISPATCH_CONFIRMED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'CANCELLED',
      ],
      default: 'NEW_ASSIGNED',
    },

    statusHistory: [
      {
        status: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'statusHistory.model' },
        model: { type: String, enum: ['User', 'Vendor'] },
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    invoiceStatus: { type: String, enum: ['PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    dispatchStatus: { type: String, enum: ['PENDING', 'READY', 'DISPATCHED', 'DELIVERED'], default: 'PENDING' },

    expectedDispatchDate: Date,
    expectedDeliveryDate: Date,
    actualDispatchDate: Date,
    actualDeliveryDate: Date,

    totalAmount: { type: Number, required: true },
    priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    adminNotes: String,
    dispatchInstructions: String,

    structbayLogistics: {
      pickupScheduledText: { type: String, default: null },
      companyName: { type: String, default: null },
      driverContactDetails: { type: String, default: null },
      pickupContactName: { type: String, default: null },
      pickupContactPhone: { type: String, default: null },
    },

    /** Vendor step: packing + optional pre-dispatch invoice before admin approves dispatch */
    preDispatch: {
      packingFiles: [
        {
          url: String,
          cloudinaryId: String,
          name: String,
        },
      ],
      invoiceFileUrl: String,
      invoiceCloudinaryId: String,
      remarks: String,
    },

    /** After Structbay sends docs; vendor fills LR / transporter etc. */
    shipmentDispatch: {
      transporterName: String,
      vehicleNumber: String,
      lrNumber: String,
      trackingNumber: String,
      dispatchDate: Date,
      proofUrl: String,
      proofCloudinaryId: String,
    },

    /** POD + admin confirmation */
    deliveryProof: {
      deliveryDate: Date,
      podUrl: String,
      podCloudinaryId: String,
      confirmedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      confirmedAt: Date,
    },

    /** Structbay invoice + e-way to vendor */
    structbayOutboundDocs: {
      invoicePdfUrl: String,
      invoicePdfCloudinaryId: String,
      invoiceNumber: String,
      ewayBillPdfUrl: String,
      ewayBillPdfCloudinaryId: String,
      ewayBillNumber: String,
      sentAt: Date,
      sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    /** 2 = Structbay admin/vendor workflow; undefined/1 = legacy behaviour */
    workflowVersion: { type: Number, default: 2 },

    rejectReason: String,
    adminChangeRequestNote: String,

    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
  }
);

vendorOrderSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

vendorOrderSchema.index({ vendor: 1, status: 1 });
vendorOrderSchema.index({ masterOrder: 1 });
vendorOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorOrder', vendorOrderSchema);
