const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderType: { type: String, enum: ['VENDOR', 'ADMIN'], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, default: '' },
  attachments: [{
    url: String,
    filename: String,
    contentType: String
  }],
  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now }
}, { _id: true });

const vendorChatSchema = new mongoose.Schema({
  vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [messageSchema],
  lastMessageAt: { type: Date, default: Date.now },
  unreadByAdmin: { type: Number, default: 0 },
  unreadByVendor: { type: Number, default: 0 }
}, { timestamps: true });

vendorChatSchema.index({ vendorOrder: 1 }, { unique: true });

module.exports = mongoose.model('VendorChat', vendorChatSchema);
