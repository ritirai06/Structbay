const mongoose = require('mongoose');

// GlobalSettings is a singleton document
const globalSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'GLOBAL',
      unique: true,
      immutable: true,
    },
    
    // General Settings
    siteName: { type: String, default: 'Structbay' },
    supportEmail: { type: String, default: 'support@structbay.com' },
    supportPhone: { type: String, default: '+91 70905 70505' },

    // Email Settings
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: String, default: '587' },
    smtpUser: { type: String, default: 'hello@structbay.com' },
    smtpPass: { type: String, default: '' },

    // Notifications Settings
    orderNotifications: { type: Boolean, default: true },
    lowStockAlerts: { type: Boolean, default: true },
    rfqNotifications: { type: Boolean, default: true },
    dailyReports: { type: Boolean, default: false },

    // Payment Settings
    razorpayKey: { type: String, default: '' },
    razorpaySecret: { type: String, default: '' },
    testMode: { type: Boolean, default: true },

    // Tax Settings
    gstNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    inclusivePricing: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const GlobalSettings = mongoose.model('GlobalSettings', globalSettingsSchema);
module.exports = GlobalSettings;
