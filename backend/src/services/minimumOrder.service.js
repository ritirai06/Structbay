const CMS = require('../models/CMS');

// Cache the minimum order value to avoid repeated DB calls
let cachedMinOrderValue = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get the configured minimum order value from CMS settings.
 * Uses caching to avoid repeated database queries.
 * @returns {Promise<number>} The minimum order value in INR
 */
const getMinimumOrderValue = async () => {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedMinOrderValue !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedMinOrderValue;
  }
  
  // Fetch from database
  const cms = await CMS.getOrCreate();
  cachedMinOrderValue = cms.commerceSettings?.minimumOrderValue || 2000;
  cacheTimestamp = now;
  
  return cachedMinOrderValue;
};

/**
 * Clear the minimum order value cache.
 * Call this when updating the setting in admin.
 */
const clearMinimumOrderValueCache = () => {
  cachedMinOrderValue = null;
  cacheTimestamp = 0;
};

/**
 * Validate if a cart total meets the minimum order requirement.
 * @param {number} cartTotal - The cart subtotal in INR
 * @returns {Promise<{meetsMinimum: boolean, minimumValue: number, difference: number, percentage: number}>}
 */
const validateMinimumOrder = async (cartTotal) => {
  const minimumValue = await getMinimumOrderValue();
  const meetsMinimum = cartTotal >= minimumValue;
  const difference = Math.max(0, minimumValue - cartTotal);
  const percentage = Math.min(100, Math.round((cartTotal / minimumValue) * 100));
  
  return {
    meetsMinimum,
    minimumValue,
    difference,
    percentage,
  };
};

module.exports = {
  getMinimumOrderValue,
  clearMinimumOrderValueCache,
  validateMinimumOrder,
};