const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/concreteRFQ.controller');

const adminOnly = [protect, requireRole('ADMIN')];
const customerOnly = [protect, requireRole('CUSTOMER')];

// Register `/stats` before `/:id` so "stats" is never captured as an ObjectId param.
router.get('/stats',   ...adminOnly, ctrl.getStats);
router.get('/',        ...adminOnly, ctrl.getAll);
router.get('/:id',     ...adminOnly, ctrl.getById);
router.post('/',       ...customerOnly, ctrl.create);
router.patch('/:id',   ...adminOnly, ctrl.update);

module.exports = router;
