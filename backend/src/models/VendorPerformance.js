const mongoose = require('mongoose');

const vendorPerformanceSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Period
  period: { type: String, required: true }, // e.g. "2025-06"
  periodType: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },

  // Order Metrics
  totalAssigned: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  totalCancelled: { type: Number, default: 0 },
  totalPending: { type: Number, default: 0 },

  // Invoice Metrics
  invoicesUploaded: { type: Number, default: 0 },
  invoicesVerified: { type: Number, default: 0 },
  invoicesRejected: { type: Number, default: 0 },
  invoiceComplianceRate: { type: Number, default: 0 }, // %

  // Dispatch Metrics
  onTimeDispatchCount: { type: Number, default: 0 },
  lateDispatchCount: { type: Number, default: 0 },
  onTimeDispatchRate: { type: Number, default: 0 }, // %

  // Delivery Metrics
  onTimeDeliveryCount: { type: Number, default: 0 },
  lateDeliveryCount: { type: Number, default: 0 },
  onTimeDeliveryRate: { type: Number, default: 0 }, // %

  // Fulfillment
  avgFulfillmentTimeHrs: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },

  // Score (0–100)
  performanceScore: { type: Number, default: 100 },

  computedAt: { type: Date, default: Date.now },
}, { timestamps: true });

vendorPerformanceSchema.index({ vendor: 1, period: 1 }, { unique: true });
vendorPerformanceSchema.index({ period: 1 });

module.exports = mongoose.model('VendorPerformance', vendorPerformanceSchema);
