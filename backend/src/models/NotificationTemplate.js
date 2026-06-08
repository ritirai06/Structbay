const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, unique: true },
    slug:     { type: String, required: true, trim: true, lowercase: true, unique: true },

    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'SMS', 'PUSH'],
      required: true,
    },

    event: {
      type: String,
      enum: [
        'ORDER_CONFIRMED', 'ORDER_CANCELLED', 'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED',
        'VENDOR_ASSIGNED', 'DISPATCH_UPDATE', 'OUT_FOR_DELIVERY', 'DELIVERED',
        'INVOICE_GENERATED', 'RFQ_SUBMITTED', 'BULK_ENQUIRY_SUBMITTED',
        'FINANCE_APPLICATION', 'WELCOME', 'PASSWORD_RESET', 'EMAIL_VERIFY',
        'VENDOR_APPROVED', 'VENDOR_REJECTED',
        'PICKUP_SCHEDULED', 'REPLACEMENT_APPROVED', 'CUSTOM',
      ],
      required: true,
    },

    // For EMAIL
    subject:  String,
    htmlBody: String,

    // For WhatsApp / SMS / Push
    body:     String,

    // Variables used: {{customerName}}, {{orderNumber}}, etc.
    variables: [String],

    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

notificationTemplateSchema.index({ channel: 1, event: 1 });
module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
