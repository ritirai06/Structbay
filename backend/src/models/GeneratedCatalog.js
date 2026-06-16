const mongoose = require('mongoose');

/**
 * Catalog generation jobs + stored files (PDF / Excel / CSV / HTML).
 * Legacy rows may omit `status` or `storedFileName` (direct-stream exports).
 */
const generatedCatalogSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedByName: { type: String, trim: true, default: '' },
    catalogName: { type: String, trim: true, default: null },
    scopeType: {
      type: String,
      enum: ['ALL', 'SELECTED', 'CATEGORY', 'BRAND', 'PRODUCT', 'VENDOR', 'CUSTOM'],
      required: true,
    },
    scopeLabel: { type: String, trim: true, default: null },
    format: {
      type: String,
      enum: ['pdf', 'xlsx', 'csv', 'html'],
      required: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
    },
    /** Filename only, under uploads/catalogs/ */
    storedFileName: { type: String, default: null },
    fileSizeBytes: { type: Number, default: null },
    productCount: { type: Number, default: 0 },
    rowCount: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    options: { type: mongoose.Schema.Types.Mixed, default: {} },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    payloadSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

generatedCatalogSchema.index({ createdAt: -1 });
generatedCatalogSchema.index({ createdBy: 1, createdAt: -1 });
generatedCatalogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('GeneratedCatalog', generatedCatalogSchema);
