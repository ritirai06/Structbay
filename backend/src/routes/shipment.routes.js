const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/shipment.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.post  ('/',                       ...adminOnly, ctrl.create);
router.get   ('/',                       ...adminOnly, ctrl.getByOrder);
router.get   ('/:id',                    ...adminOnly, ctrl.getById);
router.patch ('/:id/status',             ...adminOnly, ctrl.updateStatus);
router.post  ('/:id/delivery-notes',     ...adminOnly, ctrl.addDeliveryNote);
router.post  ('/:id/pod',                ...adminOnly, ctrl.uploadPOD);

module.exports = router;
