const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  // Authentication
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'vendor', enum: ['vendor'] },
  
  // Company Info
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  alternatePhone: String,
  
  // Business Details
  gstNumber: { type: String, required: true },
  panNumber: { type: String, required: true },
  businessType: { type: String, enum: ['proprietorship', 'partnership', 'pvtltd', 'llp', 'other'] },
  
  // Address
  officeAddress: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  
  // Bank Details
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branch: String
  },
  
  // Profile
  profileImage: String,
  
  // Product Categories Handled
  categories: [String],
  
  // Service Cities
  serviceCities: [String],
  
  // Status
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  
  // Notification Preferences
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    orderAssigned: { type: Boolean, default: true },
    invoiceRequest: { type: Boolean, default: true },
    dispatchRequest: { type: Boolean, default: true },
    deliveryUpdates: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true }
  },
  
  // Performance Metrics
  performance: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    pendingOrders: { type: Number, default: 0 },
    averageFulfillmentTime: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: Number, default: 100 },
    invoiceComplianceRate: { type: Number, default: 100 },
    rating: { type: Number, default: 5.0 }
  },
  
  // Timestamps
  lastLogin: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

vendorSchema.index({ email: 1 });
vendorSchema.index({ gstNumber: 1 });
vendorSchema.index({ status: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
