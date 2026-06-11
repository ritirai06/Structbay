const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/pricing.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/',        ...adminOnly, ctrl.getAll);
router.post('/',       ...adminOnly, ctrl.upsert);
router.post('/bulk-import', ...adminOnly, ctrl.bulkImport);
router.delete('/:id',  ...adminOnly, ctrl.remove);

module.exports = router;
