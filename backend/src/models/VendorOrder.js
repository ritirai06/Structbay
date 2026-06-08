const mongoose = require('mongoose');

const vendorOrderSchema = new mongoose.Schema({
  // Master Order Reference
  masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true, unique: true },
  
  // Vendor Assignment
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now },
  
  // Assigned Products (Only products assigned to this vendor)
  assignedProducts: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    quantity: { type: Number, required: true },
    unit: String,
    price: Number,
    totalAmount: Number
  }],
  
  // Customer Details (Limited)
  customer: {
    name: String,
    phone: String,
    email: String
  },
  
  // Delivery Address
  deliveryAddress: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    contactPerson: String,
    contactPhone: String
  },
  
  // Delivery Type
  deliveryType: { type: String, enum: ['vendor_delivery', 'structbay_delivery'], required: true },
  
  // Status Workflow
  status: {
    type: String,
    enum: [
      'new_order_alert',
      'ready_for_dispatch',
      'vendor_invoice_sent',
      'dispatched',
      'pickup_scheduled',
      'material_handed_over',
      'in_transit',
      'material_delivered',
      'delivery_confirmed',
      'completed',
      'cancelled'
    ],
    default: 'new_order_alert'
  },
  
  // Status History
  statusHistory: [{
    status: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'statusHistory.updatedByModel' },
    updatedByModel: { type: String, enum: ['Vendor', 'User'] },
    remarks: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Invoice Status
  invoiceStatus: { type: String, enum: ['pending', 'uploaded', 'verified', 'rejected'], default: 'pending' },
  
  // Dispatch Status
  dispatchStatus: { type: String, enum: ['pending', 'ready', 'dispatched', 'delivered'], default: 'pending' },
  
  // Admin Notes
  adminNotes: String,
  dispatchInstructions: String,
  
  // Important Dates
  expectedDispatchDate: Date,
  expectedDeliveryDate: Date,
  actualDispatchDate: Date,
  actualDeliveryDate: Date,
  
  // Amounts
  totalAmount: { type: Number, required: true },
  
  // Priority
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' }
}, { timestamps: true });

vendorOrderSchema.index({ vendor: 1, status: 1 });
vendorOrderSchema.index({ orderNumber: 1 });
vendorOrderSchema.index({ masterOrder: 1 });
vendorOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorOrder', vendorOrderSchema);
