const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS, VENDOR_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    // ─── Core Identity ──────────────────────────────────────
    referenceNumber: { type: String, unique: true, sparse: true }, // CUS... or VND...
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    // ─── Role & Status ──────────────────────────────────────
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
    },

    // ─── Profile ────────────────────────────────────────────
    profileImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },

    // ─── Email Verification ──────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ─── Security: failed login tracking ────────────────────
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },

    // ─── Session Tracking ────────────────────────────────────
    lastLogin: { type: Date, default: null },
    lastLoginIP: { type: String, default: null, select: false },

    // ─── Vendor-Specific ────────────────────────────────────
    vendorStatus: {
      type: String,
      enum: [...Object.values(VENDOR_STATUS), null],
      default: null,
    },
    companyName: { type: String, trim: true, default: null },
    contactPerson: { type: String, trim: true, default: null },
    /** Customer billing address (pre-fills checkout). */
    billingAddress: { type: String, trim: true, default: null },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      validate: {
        validator: function (v) {
          if (!v || String(v).trim() === '') return true; // optional — skip if blank
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(v).trim().toUpperCase());
        },
        message: 'Please enter a valid GST number',
      },
      sparse: true,
    },
    businessRegNumber: { type: String, trim: true, default: null },
    vendorRejectionReason: { type: String, default: null },
    vendorApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    vendorApprovedAt: { type: Date, default: null },

    /** VENDOR: cities this vendor serves (ObjectIds → City). Empty/unset = legacy “all cities” until configured in admin. */
    serviceCityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],

    // ─── Vendor Extended Profile ─────────────────────────────
    panNumber: { type: String, trim: true, uppercase: true, default: null },
    officeAddress: {
      street: String, area: String, city: String,
      state: String, pincode: String, landmark: String,
    },
    companyAddress: { type: String, default: null },
    warehouseAddress: { type: String, default: null },
    contactPersonName: { type: String, default: null },
    contactPersonPhone: { type: String, default: null },
    cancelledChequeFile: { type: String, default: null },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branch: String,
      branchName: { type: String, default: null },
      cancelledChequeFile: { type: String, default: null },
    },
    notifications: {
      email:           { type: Boolean, default: true },
      sms:             { type: Boolean, default: true },
      whatsapp:        { type: Boolean, default: false },
      orderAssigned:   { type: Boolean, default: true },
      invoiceRequest:  { type: Boolean, default: true },
      dispatchRequest: { type: Boolean, default: true },
      deliveryUpdates: { type: Boolean, default: true },
      announcements:   { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.lastLoginIP;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ────────────────────────────────────────────────
userSchema.index({ role: 1, status: 1 });
userSchema.index({ vendorStatus: 1 });
userSchema.index({ createdAt: -1 });

// ─── Virtual: isLocked ──────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

userSchema.virtual('isVendor').get(function () {
  return this.role === ROLES.VENDOR;
});

userSchema.virtual('isAdmin').get(function () {
  return this.role === ROLES.ADMIN;
});

// Multiple admins are now supported

// ─── Pre-save: Hash password ─────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Method: Compare password ────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: Increment failed login ──────────────────────────
userSchema.methods.incFailedLogin = async function () {
  this.failedLoginAttempts += 1;
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  return this.save({ validateBeforeSave: false });
};

// ─── Method: Reset failed login ──────────────────────────────
userSchema.methods.resetFailedLogin = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  return this.save({ validateBeforeSave: false });
};

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'DELETED' } } }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
