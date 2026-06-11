const mongoose = require('mongoose');

/**
 * One row per allocated StructBay reference — audit trail and global search index.
 */
const referenceAllocationSchema = new mongoose.Schema(
  {
    module:           { type: String, required: true, index: true },
    referenceNumber:  { type: String, required: true, unique: true },
    dateKey:          { type: String, required: true }, // DDMMYY
    sequence:         { type: Number, required: true },
    /** Optional link to originating entity (Mongo id for internal use only). */
    entityModel:      { type: String, default: null },
    entityId:         { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

referenceAllocationSchema.index({ dateKey: 1, module: 1 });
referenceAllocationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ReferenceAllocation', referenceAllocationSchema);
