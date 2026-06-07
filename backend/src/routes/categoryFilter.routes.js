const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/categoryFilter.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/:categoryId',    ctrl.getByCategory);
router.put('/:categoryId',    ...adminOnly, ctrl.upsert);

module.exports = router;
