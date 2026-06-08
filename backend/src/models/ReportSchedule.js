const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    reportType:  { type: String, required: true }, // 'kpi' | 'sales' | 'vendor' | etc.
    frequency:   { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
    recipients:  [{ type: String }],               // email addresses
    filters:     { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive:    { type: Boolean, default: true },
    lastRunAt:   Date,
    nextRunAt:   Date,
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

reportScheduleSchema.index({ isActive: 1, nextRunAt: 1 });
module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
