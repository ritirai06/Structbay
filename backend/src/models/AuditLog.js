const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    logNumber: { type: String, unique: true, sparse: true },
    action: { type: String, required: true, trim: true }, // e.g. 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
    module: { type: String, required: true, trim: true }, // e.g. 'Banner', 'Category', 'Vendor'
    targetId: { type: String, default: null }, // ID of the affected resource
    description: { type: String, trim: true },
    ipAddress: { type: String, default: null },
    /** Client hint, e.g. WEB, MOBILE (from User-Agent or app). */
    platform: { type: String, default: null, trim: true },
    oldData: { type: mongoose.Schema.Types.Mixed, default: null },
    newData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
