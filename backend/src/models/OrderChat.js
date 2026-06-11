const mongoose = require('mongoose');

const orderChatSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    messages: [
      {
        senderType: { type: String, enum: ['CUSTOMER', 'ADMIN'], required: true },
        sender:     { type: mongoose.Schema.Types.ObjectId, required: true },
        text:       String,
        attachments:[
          {
            url:      String,
            mimeType: String,
            label:    String,
          },
        ],
        isRead:     { type: Boolean, default: false },
        sentAt:     { type: Date, default: Date.now },
      },
    ],

    isActive:        { type: Boolean, default: true },
    lastMessageAt:   Date,
    unreadByAdmin:   { type: Number, default: 0 },
    unreadByCustomer:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

orderChatSchema.index({ masterOrder: 1 });
orderChatSchema.index({ customer: 1 });

module.exports = mongoose.model('OrderChat', orderChatSchema);
