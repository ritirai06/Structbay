/**
 * Massive Variation Generation Service
 * Handles generation of 10,000+ product variations efficiently
 * Uses batching to avoid memory issues and timeouts
 */

const mongoose = require('mongoose');
const ProductVariation = require('../models/ProductVariation');
const { normalizeVariationAttributes, packageAttributesForSave } = require('../utils/variationAttributes');
const { resolveVariantSku } = require('./variationSku.service');
const { attributeValuesEquivalent } = require('../utils/attributeValueNormalize');

const BATCH_SIZE = 1000; // Insert 1000 variations per batch
const DUPLICATE_CHECK_BATCH = 500; // Check duplicates in batches

/**
 * Generate variation matrix without artificial limits
 * Supports 10,000+ variations
 */
async function generateVariationMatrixMassive(product, axes, options = {}) {
  const {
    skipDuplicateCheck = false,
    batchSize = BATCH_SIZE,
    onProgress = null,
  } = options;

  // Cartesian product
  function cartesian(arrays) {
    return arrays.reduce(
      (acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])),
      [[]]
    );
  }

  const axisArrays = axes.map((a) =>
    a.values.map((v) => ({
      axisKey: a.key,
      value: typeof v === 'object' ? v.value : String(v),
      colorCode: typeof v === 'object' ? v.colorCode || null : null,
    }))
  );

  const combinations = cartesian(axisArrays);
  const totalCombinations = combinations.length;

  if (onProgress) {
    onProgress({
      stage: 'calculated',
      totalCombinations,
      message: `Will generate ${totalCombinations} variations`,
    });
  }

  const created = [];
  const skipped = [];
  let processed = 0;

  // Get existing variations once (for duplicate checking)
  let existingVariations = [];
  if (!skipDuplicateCheck) {
    existingVariations = await ProductVariation.find({
      product: product._id,
      isDeleted: { $ne: true },
    })
      .select('attributes')
      .lean();

    if (onProgress) {
      onProgress({
        stage: 'duplicates_loaded',
        existingCount: existingVariations.length,
        message: `Loaded ${existingVariations.length} existing variations for duplicate checking`,
      });
    }
  }

  // Process combinations in batches
  for (let batchStart = 0; batchStart < combinations.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, combinations.length);
    const batchCombos = combinations.slice(batchStart, batchEnd);
    const batchVariations = [];

    for (const combo of batchCombos) {
      processed++;

      const pairsForSave = combo.map((cell) => ({
        name: cell.axisKey,
        value: cell.value,
      }));

      if (combo.some((c) => c.colorCode)) {
        const colorCell = combo.find((c) => c.colorCode);
        if (colorCell) {
          pairsForSave.push({
            name: `${colorCell.axisKey}_code`,
            value: colorCell.colorCode,
          });
        }
      }

      const flatAttributes = normalizeVariationAttributes({
        attributePairs: pairsForSave,
      });

      if (!Object.keys(flatAttributes).length) continue;

      const attributes = packageAttributesForSave(flatAttributes);

      // Check for duplicates
      if (!skipDuplicateCheck) {
        const isDuplicate = existingVariations.some((v) => {
          const existFlat = normalizeVariationAttributes({
            attributes: v.attributes,
          });
          const newFlat = { ...flatAttributes };
          const axisKeys = combo.map((c) => c.axisKey.toLowerCase());

          return axisKeys.every((ak) => {
            const ev =
              existFlat[ak] ||
              existFlat[
                Object.keys(existFlat).find((k) => k.toLowerCase() === ak) || ''
              ];
            const nv =
              newFlat[ak] ||
              newFlat[Object.keys(newFlat).find((k) => k.toLowerCase() === ak) || ''];
            return ev && nv && attributeValuesEquivalent(ev, nv, ak);
          });
        });

        if (isDuplicate) {
          skipped.push(combo.map((c) => `${c.axisKey}:${c.value}`).join(' + '));
          continue;
        }
      }

      const sku = await resolveVariantSku({
        product,
        requestedSku: null,
        attributes,
      });

      batchVariations.push({
        product: product._id,
        attributes,
        sku,
        status: 'ACTIVE',
        sortOrder: created.length + skipped.length,
      });
    }

    // Insert batch
    if (batchVariations.length > 0) {
      const inserted = await ProductVariation.insertMany(batchVariations, {
        ordered: false,
      }).catch((err) => {
        // Handle duplicate key errors gracefully
        if (err.code === 11000) {
          return err.insertedDocs || [];
        }
        throw err;
      });

      created.push(...inserted);

      if (onProgress) {
        onProgress({
          stage: 'batch_inserted',
          processed,
          totalCombinations,
          batchSize: inserted.length,
          createdTotal: created.length,
          skippedTotal: skipped.length,
          progress: Math.round((processed / totalCombinations) * 100),
          message: `Processed ${processed}/${totalCombinations} combinations (${created.length} created, ${skipped.length} skipped)`,
        });
      }
    }
  }

  return {
    created,
    skipped,
    total: totalCombinations,
    stats: {
      totalCombinations,
      createdCount: created.length,
      skippedCount: skipped.length,
      processingTime: new Date().toISOString(),
    },
  };
}

/**
 * Stream variations for large datasets
 * Useful for exports or processing
 */
async function* streamVariations(productId, batchSize = 1000) {
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await ProductVariation.find({
      product: productId,
      isDeleted: { $ne: true },
    })
      .skip(skip)
      .limit(batchSize)
      .lean();

    if (batch.length === 0) {
      hasMore = false;
    } else {
      yield batch;
      skip += batchSize;
    }
  }
}

/**
 * Get variation count for a product
 */
async function getVariationCount(productId) {
  return ProductVariation.countDocuments({
    product: productId,
    isDeleted: { $ne: true },
  });
}

module.exports = {
  generateVariationMatrixMassive,
  streamVariations,
  getVariationCount,
  BATCH_SIZE,
  DUPLICATE_CHECK_BATCH,
};

// Export as massiveVariationService for compatibility
module.exports.massiveVariationService = module.exports;
