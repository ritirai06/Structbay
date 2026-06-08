const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/pickup.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.post  ('/',              ...adminOnly, ctrl.create);
router.get   ('/',              ...adminOnly, ctrl.getAll);
router.patch ('/:id/status',    ...adminOnly, ctrl.updateStatus);

module.exports = router;
