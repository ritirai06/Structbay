/**
 * Colour Search Service
 * Handles searching for colours across products with massive variations
 * Supports partial matching on colour names and codes
 */

const ProductVariation = require('../models/ProductVariation');
const { normalizeVariationAttributes } = require('../utils/variationAttributes');

/**
 * Search for colours matching a query
 * Supports partial colour code and colour name matching
 */
async function searchColours(query, options = {}) {
  const {
    productId = null,
    limit = 50,
    skip = 0,
    caseSensitive = false,
  } = options;

  if (!query || String(query).trim().length === 0) {
    return { colours: [], total: 0 };
  }

  const q = String(query).trim();
  const searchRegex = caseSensitive
    ? new RegExp(q, 'g')
    : new RegExp(q, 'gi');

  // Build filter
  const filter = { isDeleted: { $ne: true } };
  if (productId) filter.product = productId;

  // Get variations with searchText index
  const variations = await ProductVariation.find(filter)
    .select('attributes searchText')
    .lean()
    .limit(limit + skip)
    .skip(skip);

  const colourSet = new Map(); // colourName → { name, code, count }

  for (const v of variations) {
    const flat = normalizeVariationAttributes({ attributes: v.attributes });

    // Look for colour-related attributes
    for (const [key, value] of Object.entries(flat)) {
      const keyLower = String(key).toLowerCase();
      const valueLower = String(value).toLowerCase();

      // Check if this is a colour attribute
      if (
        keyLower.includes('color') ||
        keyLower.includes('colour') ||
        keyLower.includes('shade') ||
        keyLower.includes('hue')
      ) {
        // Skip colour code attributes (they end with _code)
        if (keyLower.endsWith('_code')) continue;

        // Check if value matches query
        if (valueLower.includes(q.toLowerCase())) {
          const colourName = String(value).trim();
          const codeKey = `${key}_code`;
          const colourCode = flat[codeKey] || null;

          if (!colourSet.has(colourName)) {
            colourSet.set(colourName, {
              name: colourName,
              code: colourCode,
              count: 0,
            });
          }

          const entry = colourSet.get(colourName);
          entry.count += 1;
        }
      }
    }
  }

  // Convert to array and sort by count (most common first)
  const colours = Array.from(colourSet.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return {
    colours,
    total: colourSet.size,
    query: q,
  };
}

/**
 * Get all unique colours for a product
 * Useful for building colour filters
 */
async function getProductColours(productId, options = {}) {
  const { limit = 1000 } = options;

  const variations = await ProductVariation.find({
    product: productId,
    isDeleted: { $ne: true },
  })
    .select('attributes')
    .lean()
    .limit(limit);

  const colourMap = new Map();

  for (const v of variations) {
    const flat = normalizeVariationAttributes({ attributes: v.attributes });

    for (const [key, value] of Object.entries(flat)) {
      const keyLower = String(key).toLowerCase();

      if (
        (keyLower.includes('color') || keyLower.includes('colour')) &&
        !keyLower.endsWith('_code')
      ) {
        const colourName = String(value).trim();
        const codeKey = `${key}_code`;
        const colourCode = flat[codeKey] || null;

        if (!colourMap.has(colourName)) {
          colourMap.set(colourName, {
            name: colourName,
            code: colourCode,
          });
        }
      }
    }
  }

  return Array.from(colourMap.values());
}

/**
 * Find variations matching a colour
 * Returns variations that have the specified colour
 */
async function findVariationsByColour(productId, colourName, options = {}) {
  const { limit = 100, skip = 0 } = options;

  const variations = await ProductVariation.find({
    product: productId,
    isDeleted: { $ne: true },
  })
    .select('_id attributes sku status')
    .lean()
    .skip(skip)
    .limit(limit);

  const matching = [];

  for (const v of variations) {
    const flat = normalizeVariationAttributes({ attributes: v.attributes });

    for (const [key, value] of Object.entries(flat)) {
      const keyLower = String(key).toLowerCase();

      if (
        (keyLower.includes('color') || keyLower.includes('colour')) &&
        !keyLower.endsWith('_code')
      ) {
        if (String(value).toLowerCase() === colourName.toLowerCase()) {
          const codeKey = `${key}_code`;
          const colourCode = flat[codeKey] || null;

          matching.push({
            variationId: v._id,
            sku: v.sku,
            status: v.status,
            colourName: String(value),
            colourCode,
          });
          break;
        }
      }
    }
  }

  return matching;
}

module.exports = {
  searchColours,
  getProductColours,
  findVariationsByColour,
};
