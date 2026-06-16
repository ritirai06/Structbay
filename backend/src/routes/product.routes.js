const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/product.controller');

const adminOnly = [protect, requireRole('ADMIN')];

// Products
router.get('/',                          ctrl.getAll);
router.get('/slug/:slug',                ctrl.getBySlug);
router.get('/bulk-import-template',      ...adminOnly, ctrl.getBulkImportTemplate);
router.post('/bulk-import',              ...adminOnly, ctrl.bulkImport);
router.post('/bulk-import-variants',    ...adminOnly, ctrl.bulkImportVariants);
router.get('/:id',                       ctrl.getById);
router.post('/',                         ...adminOnly, ctrl.create);
router.patch('/:id',                     ...adminOnly, ctrl.update);
router.post('/:id/images',               ...adminOnly, ctrl.addImages);
router.delete('/:id/images/:imageId',    ...adminOnly, ctrl.removeImage);
router.delete('/:id',                    ...adminOnly, ctrl.remove);

// Variations
router.get('/:id/variations',             ctrl.getVariations);
router.post('/:id/variations',            ...adminOnly, ctrl.createVariation);
router.patch('/:id/variations/:varId',    ...adminOnly, ctrl.updateVariation);
router.delete('/:id/variations/:varId',   ...adminOnly, ctrl.deleteVariation);

module.exports = router;
