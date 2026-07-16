/**
 * Colour Search Service
 * Handles fast searching of colour names and codes
 * Optimized for products with 2500+ colour options
 */

const ProductVariation = require('../models/ProductVariation');
const { normalizeVariationAttributes } = require('../utils/variationAttributes');

/**
 * Search colours by name or code
 * Supports partial matching and case-insensitive search
 */
async function searchColours(productId, query, options = {}) {
  const {
    limit = 50,
    skip = 0,
    attributeName = 'colour',
    codeAttributeName = 'colour_code',
  } = options;

  if (!query || query.trim().length === 0) {
    return { results: [], total: 0, query };
  }

  const searchQuery = query.trim().toLowerCase();

  // Build regex for partial matching
  const regex = new RegExp(searchQuery, 'i');

  // Find variations with matching colour attributes
  const variations = await ProductVariation.find({
    product: productId,
    isDeleted: { $ne: true },
    status: 'ACTIVE',
  })
    .select('attributes')
    .lean();

  // Extract unique colours from variations
  const colourMap = new Map(); // key -> { name, code, count }

  for (const variation of variations) {
    const attrs = normalizeVariationAttributes({ attributes: variation.attributes });

    // Get colour name
    const colourKey = Object.keys(attrs).find(
      (k) => k.toLowerCase() === attributeName.toLowerCase()
    );
    const colourName = colourKey ? attrs[colourKey] : null;

    // Get colour code
    const codeKey = Object.keys(attrs).find(
      (k) => k.toLowerCase() === codeAttributeName.toLowerCase()
    );
    const colourCode = codeKey ? attrs[codeKey] : null;

    if (colourName || colourCode) {
      const key = `${colourName}|${colourCode}`;

      if (!colourMap.has(key)) {
        colourMap.set(key, {
          name: colourName || '',
          code: colourCode || '',
          count: 0,
        });
      }

      const entry = colourMap.get(key);
      entry.count += 1;
    }
  }

  // Filter by search query
  const filtered = Array.from(colourMap.values()).filter((colour) => {
    const nameMatch = colour.name && regex.test(colour.name);
    const codeMatch = colour.code && regex.test(colour.code);
    return nameMatch || codeMatch;
  });

  // Sort by relevance (exact match first, then by count)
  filtered.sort((a, b) => {
    const aExactName = a.name && a.name.toLowerCase() === searchQuery;
    const bExactName = b.name && b.name.toLowerCase() === searchQuery;
    const aExactCode = a.code && a.code.toLowerCase() === searchQuery;
    const bExactCode = b.code && b.code.toLowerCase() === searchQuery;

    if (aExactName && !bExactName) return -1;
    if (!aExactName && bExactName) return 1;
    if (aExactCode && !bExactCode) return -1;
    if (!aExactCode && bExactCode) return 1;

    return b.count - a.count;
  });

  const total = filtered.length;
  const results = filtered.slice(skip, skip + limit);

  return {
    results,
    total,
    query: searchQuery,
    skip,
    limit,
    hasMore: skip + limit < total,
  };
}

/**
 * Get all unique colours for a product
 * Useful for building colour palettes
 */
async function getAllColours(productId, options = {}) {
  const { attributeName = 'colour', codeAttributeName = 'colour_code' } = options;

  const variations = await ProductVariation.find({
    product: productId,
    isDeleted: { $ne: true },
    status: 'ACTIVE',
  })
    .select('attributes')
    .lean();

  const colourMap = new Map();

  for (const variation of variations) {
    const attrs = normalizeVariationAttributes({ attributes: variation.attributes });

    const colourKey = Object.keys(attrs).find(
      (k) => k.toLowerCase() === attributeName.toLowerCase()
    );
    const colourName = colourKey ? attrs[colourKey] : null;

    const codeKey = Object.keys(attrs).find(
      (k) => k.toLowerCase() === codeAttributeName.toLowerCase()
    );
    const colourCode = codeKey ? attrs[codeKey] : null;

    if (colourName || colourCode) {
      const key = `${colourName}|${colourCode}`;

      if (!colourMap.has(key)) {
        colourMap.set(key, {
          name: colourName || '',
          code: colourCode || '',
          count: 0,
        });
      }

      const entry = colourMap.get(key);
      entry.count += 1;
    }
  }

  return Array.from(colourMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Find variations matching a colour
 */
async function findVariationsByColour(productId, colourName, colourCode, options = {}) {
  const { attributeName = 'colour', codeAttributeName = 'colour_code' } = options;

  const query = {
    product: productId,
    isDeleted: { $ne: true },
    status: 'ACTIVE',
  };

  // Build attribute search conditions
  const conditions = [];

  if (colourName) {
    conditions.push({
      attributes: {
        $elemMatch: {
          key: new RegExp(`^${attributeName}$`, 'i'),
          value: new RegExp(`^${colourName}$`, 'i'),
        },
      },
    });
  }

  if (colourCode) {
    conditions.push({
      attributes: {
        $elemMatch: {
          key: new RegExp(`^${codeAttributeName}$`, 'i'),
          value: new RegExp(`^${colourCode}$`, 'i'),
        },
      },
    });
  }

  if (conditions.length > 0) {
    query.$or = conditions;
  }

  return ProductVariation.find(query).lean();
}

/**
 * Check if a product has many colours (threshold for showing search instead of dropdown)
 */
async function hasManyColours(productId, threshold = 100, attributeName = 'colour') {
  const variations = await ProductVariation.find({
    product: productId,
    isDeleted: { $ne: true },
    status: 'ACTIVE',
  })
    .select('attributes')
    .lean();

  const colourSet = new Set();

  for (const variation of variations) {
    const attrs = normalizeVariationAttributes({ attributes: variation.attributes });

    const colourKey = Object.keys(attrs).find(
      (k) => k.toLowerCase() === attributeName.toLowerCase()
    );

    if (colourKey) {
      colourSet.add(attrs[colourKey]);
    }
  }

  return colourSet.size >= threshold;
}

module.exports = {
  searchColours,
  getAllColours,
  findVariationsByColour,
  hasManyColours,
};
