const { body, param, query } = require('express-validator');

const scopeTypes = ['ALL', 'SELECTED', 'CATEGORY', 'BRAND', 'PRODUCT', 'VENDOR'];

exports.catalogCreateJobValidator = [
  body('scopeType').isIn(scopeTypes).withMessage('Invalid scopeType'),
  body('format').optional().isIn(['pdf', 'xlsx', 'csv', 'html']).withMessage('format must be pdf, xlsx, csv, or html'),
  body('catalogName').optional().isString().isLength({ max: 200 }),
  body('productId').optional().isMongoId(),
  body('categoryId').optional().isMongoId(),
  body('brandId').optional().isMongoId(),
  body('vendorUserId').optional().isMongoId(),
  body('productIds').optional().isArray({ max: 2500 }),
  body('productIds.*').optional().isMongoId(),
  body('filters').optional().isObject(),
  body('options').optional().isObject(),
  body().custom((value, { req }) => {
    const { scopeType } = req.body;
    if (scopeType === 'PRODUCT' && !req.body.productId) {
      throw new Error('productId is required for PRODUCT scope');
    }
    if (scopeType === 'SELECTED' && (!Array.isArray(req.body.productIds) || req.body.productIds.length === 0)) {
      throw new Error('productIds (non-empty array) is required for SELECTED scope');
    }
    if (scopeType === 'CATEGORY' && !req.body.categoryId) {
      throw new Error('categoryId is required for CATEGORY scope');
    }
    if (scopeType === 'BRAND' && !req.body.brandId) {
      throw new Error('brandId is required for BRAND scope');
    }
    if (scopeType === 'VENDOR' && !req.body.vendorUserId) {
      throw new Error('vendorUserId is required for VENDOR scope');
    }
    return true;
  }),
];

exports.catalogJobIdValidator = [param('id').isMongoId().withMessage('Invalid job id')];

exports.catalogJobsListValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('includeArchived').optional().isIn(['true', 'false']),
];

exports.catalogArchiveValidator = [
  param('id').isMongoId().withMessage('Invalid job id'),
  body('archived').isBoolean().withMessage('archived must be boolean'),
];
