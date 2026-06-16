const { body, query } = require('express-validator');

const scopeValues = ['PRODUCT', 'CATEGORY', 'BRAND', 'VENDOR', 'CUSTOM'];

exports.catalogExportValidator = [
  body('scope').isIn(scopeValues).withMessage('Invalid scope'),
  body('format').optional().isIn(['csv', 'html']).withMessage('format must be csv or html'),
  body('productId').optional().isMongoId(),
  body('categoryId').optional().isMongoId(),
  body('brandId').optional().isMongoId(),
  body('vendorUserId').optional().isMongoId(),
  body('productIds').optional().isArray({ max: 2500 }),
  body('productIds.*').optional().isMongoId(),
  body().custom((value, { req }) => {
    const { scope } = req.body;
    if (scope === 'PRODUCT' && !req.body.productId) {
      throw new Error('productId is required for PRODUCT scope');
    }
    if (scope === 'CATEGORY' && !req.body.categoryId) {
      throw new Error('categoryId is required for CATEGORY scope');
    }
    if (scope === 'BRAND' && !req.body.brandId) {
      throw new Error('brandId is required for BRAND scope');
    }
    if (scope === 'VENDOR' && !req.body.vendorUserId) {
      throw new Error('vendorUserId is required for VENDOR scope');
    }
    if (scope === 'CUSTOM' && (!Array.isArray(req.body.productIds) || req.body.productIds.length === 0)) {
      throw new Error('productIds (non-empty array) is required for CUSTOM scope');
    }
    return true;
  }),
];

exports.catalogHistoryQueryValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];
