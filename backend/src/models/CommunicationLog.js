const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema(
  {
    channel:  { type: String, enum: ['EMAIL', 'WHATSAPP', 'SMS', 'PUSH'], required: true },
    event:    { type: String, required: true },

    recipient:      { type: String, required: true }, // email / phone / deviceToken
    recipientType:  { type: String, enum: ['CUSTOMER', 'VENDOR', 'ADMIN'], default: 'CUSTOMER' },
    recipientRef:   { type: mongoose.Schema.Types.ObjectId },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate', default: null },
    subject:    String,
    body:       String,

    status:    { type: String, enum: ['SENT', 'DELIVERED', 'FAILED', 'PENDING'], default: 'PENDING' },
    errorMsg:  String,
    providerRef: String,   // Message-ID / WhatsApp message SID / etc.

    metadata:  mongoose.Schema.Types.Mixed,
    sentAt:    Date,
  },
  { timestamps: true }
);

communicationLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
communicationLogSchema.index({ recipientRef: 1 });
module.exports = mongoose.model('CommunicationLog', communicationLogSchema);
