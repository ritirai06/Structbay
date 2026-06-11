const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { brandCreateValidator } = require('../validators/cms.validator');
const ctrl = require('../controllers/brand.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/',                  ctrl.getAll);
router.get('/slug/:slug',        ctrl.getBySlug);
router.post('/bulk-import',      ...adminOnly, ctrl.bulkImport);
router.post('/',                 ...adminOnly, brandCreateValidator, validate, ctrl.create);
router.patch('/:id',             ...adminOnly, ctrl.update);
router.patch('/:id/logo',        ...adminOnly, ctrl.updateLogo);
router.patch('/:id/banner',      ...adminOnly, ctrl.updateBanner);
router.patch('/:id/toggle',      ...adminOnly, ctrl.toggle);
router.delete('/:id',            ...adminOnly, ctrl.remove);

module.exports = router;
