const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/order.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/',                   ...adminOnly, ctrl.getAll);
router.get('/stats',              ...adminOnly, ctrl.getStats);
router.get('/:id',                ...adminOnly, ctrl.getById);
router.post('/',                  ...adminOnly, ctrl.create);
router.patch('/:id/status',       ...adminOnly, ctrl.updateStatus);
router.patch('/:id/assign-vendor',...adminOnly, ctrl.assignVendor);
router.patch('/:id/documents',    ...adminOnly, ctrl.uploadDocs);

module.exports = router;
