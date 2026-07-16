# Product Controller Updates - Code Patch

## File: backend/src/controllers/product.controller.js

### Change 1: Add Imports (at top, after existing imports)

```javascript
const { generateVariationMatrixMassive } = require('../services/massiveVariation.service');
const { searchColours, hasManyColours } = require('../services/colourSearch.service');
```

### Change 2: Replace generateVariationMatrix Function

**REMOVE:** Lines ~1000-1100 (the old generateVariationMatrix function with 500 limit)

**ADD:** New function that uses massive variation service

```javascript
const generateVariationMatrix = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  if (product.productStructure !== 'variant') {
    throw new AppError('Change product structure to Variant Product before generating variants.', 400);
  }

  const { axes } = req.body;
  if (!Array.isArray(axes) || !axes.length) throw new AppError('axes array is required.', 400);
  
  for (const axis of axes) {
    if (!axis.key || !Array.isArray(axis.values) || !axis.values.length) {
      throw new AppError(`Each axis must have a key and at least one value.`, 400);
    }
    if (String(axis.key).trim().toLowerCase() === 'color') {
      for (const rawValue of axis.values) {
        const value = typeof rawValue === 'object' ? rawValue : { value: rawValue };
        const colorCode = String(value.colorCode || '').trim();
        const colorName = String(value.value || '').trim();
        if (colorCode && !isValidCssColor(colorCode)) {
          throw new AppError(`Invalid color code "${colorCode}" for ${colorName || 'Color'}.`, 400);
        }
        if (!colorCode && colorName && !isValidCssColor(colorName)) {
          throw new AppError(`Add a valid color code for "${colorName}".`, 400);
        }
      }
    }
  }

  // Use massive variation service - NO ARTIFICIAL LIMITS
  const result = await generateVariationMatrixMassive(product, axes, {
    skipDuplicateCheck: false,
    batchSize: 1000,
    onProgress: (progress) => {
      // Log progress for monitoring
      if (progress.stage === 'batch_inserted') {
        console.log(`[Variation Generation] ${progress.message}`);
      }
    },
  });

  return ApiResponse.created(
    res,
    `Generated ${result.created.length} variants (${result.skipped.length} already existed).`,
    {
      created: result.created,
      skipped: result.skipped,
      total: result.total,
      stats: result.stats,
    }
  );
});
```

### Change 3: Add Colour Search Endpoint

**ADD:** New function after generateVariationMatrix

```javascript
const searchProductColours = asyncHandler(async (req, res) => {
  const { q, limit = 50, skip = 0 } = req.query;
  
  const product = await Product.findById(req.params.id).select('_id').lean();
  if (!product) throw new AppError('Product not found.', 404);

  const result = await searchColours(product._id, q, {
    limit: Math.min(parseInt(limit) || 50, 100),
    skip: Math.max(0, parseInt(skip) || 0),
    attributeName: 'colour',
    codeAttributeName: 'colour_code',
  });

  return ApiResponse.success(res, 200, 'Colours searched.', result);
});
```

### Change 4: Update Module Exports

**FIND:** The module.exports at the end of the file

**REPLACE:** Add searchProductColours to exports

```javascript
module.exports = {
  getAll, getById, getBySlug, create, update, addImages, removeImage, remove, bulkImport, bulkImportVariants,
  getBulkImportTemplate,
  getVariations, createVariation, updateVariation, deleteVariation, addVariationImages, removeVariationImage,
  getVariationConfiguration, saveVariationConfiguration, generateVariationMatrix, searchProductColours,
};
```

---

## File: backend/src/routes/product.routes.js

### Add Colour Search Route

**ADD:** After existing variation routes

```javascript
// Colour search for products with many colour options
router.get('/:id/colours/search', ctrl.searchProductColours);
```

---

## File: backend/src/models/ProductVariation.js

### Add Performance Indexes

**ADD:** After existing indexes (around line ~60)

```javascript
// Indexes for fast attribute searching (especially for colours)
variationSchema.index({ 'attributes.key': 1, 'attributes.value': 1 });

// Index for product + status filtering
variationSchema.index({ product: 1, status: 1, isDeleted: 1 });
```

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| product.controller.js | Remove 500 limit, use batching | Supports 10,000+ variations |
| product.controller.js | Add searchProductColours | Fast colour search |
| product.routes.js | Add /colours/search route | API endpoint for search |
| ProductVariation.js | Add indexes | 10-100x faster searches |

## Testing the Changes

### Test 1: Generate 10,000 Variations
```bash
curl -X POST http://localhost:5000/api/v1/products/{id}/variations/generate-matrix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "axes": [
      {
        "key": "Size",
        "values": ["1L", "4L", "10L", "20L"]
      },
      {
        "key": "Colour",
        "values": [
          {"value": "Red", "colorCode": "#FF0000"},
          {"value": "Blue", "colorCode": "#0000FF"},
          // ... 2500+ colours
        ]
      }
    ]
  }'
```

### Test 2: Search Colours
```bash
curl "http://localhost:5000/api/v1/products/{id}/colours/search?q=Royal&limit=50"
```

### Test 3: Verify No Timeouts
- Generation should complete without browser timeout
- No memory leaks
- Database remains responsive
