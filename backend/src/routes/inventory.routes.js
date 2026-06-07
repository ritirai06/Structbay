const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/inventory.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/',        ...adminOnly, ctrl.getAll);
router.get('/stats',   ...adminOnly, ctrl.getStats);
router.get('/logs',    ...adminOnly, ctrl.getLogs);
router.post('/adjust', ...adminOnly, ctrl.adjust);

module.exports = router;
