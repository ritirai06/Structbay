const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { categoryCreateValidator } = require('../validators/cms.validator');
const ctrl = require('../controllers/category.controller');

const adminOnly = [protect, requireRole('ADMIN')];

// Public
router.get('/',        ctrl.getAll);
router.get('/:slug',   ctrl.getBySlug);

// Admin
router.post('/',             ...adminOnly, categoryCreateValidator, validate, ctrl.create);
router.patch('/:id',         ...adminOnly, ctrl.update);
router.patch('/:id/image',   ...adminOnly, ctrl.updateImage);
router.patch('/:id/toggle',  ...adminOnly, ctrl.toggle);
router.delete('/:id',        ...adminOnly, ctrl.remove);

module.exports = router;
