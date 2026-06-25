const mongoose = require('mongoose');

const productRelationshipSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    relatedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    relationshipType: {
      type: String,
      enum: ['UPSSELL', 'CROSS_SELL'],
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

// Prevent self-reference
productRelationshipSchema.pre('save', function(next) {
  if (this.product.toString() === this.relatedProduct.toString()) {
    const err = new Error('Cannot create relationship with the same product.');
    err.statusCode = 400;
    return next(err);
  }
  next();
});

// Compound index to prevent duplicate relationships
productRelationshipSchema.index(
  { product: 1, relatedProduct: 1, relationshipType: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// Index for efficient lookups
productRelationshipSchema.index({ product: 1, relationshipType: 1 });
productRelationshipSchema.index({ relatedProduct: 1, relationshipType: 1 });

module.exports = mongoose.model('ProductRelationship', productRelationshipSchema);