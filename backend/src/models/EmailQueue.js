const mongoose = require('mongoose');

const emailQueueSchema = new mongoose.Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  html: { type: String, required: true },
  text: { type: String },
  replyTo: { type: String },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'FAILED', 'COMPLETED'], default: 'PENDING' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  nextAttemptAt: { type: Date, default: Date.now },
  errorLogs: [{ type: String }],
  priority: { type: Number, default: 0 }, // Higher is more important
  providerId: { type: String }, // Stores Resend Email ID
}, { timestamps: true });

emailQueueSchema.index({ status: 1, nextAttemptAt: 1, priority: -1 });

module.exports = mongoose.model('EmailQueue', emailQueueSchema);
