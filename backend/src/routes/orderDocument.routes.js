const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/orderDocument.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.post  ('/',              ...adminOnly, ctrl.upload);
router.get   ('/',              ...adminOnly, ctrl.getByOrder);
router.patch ('/:id/verify',    ...adminOnly, ctrl.verify);
router.patch ('/:id/reject',    ...adminOnly, ctrl.reject);

module.exports = router;
