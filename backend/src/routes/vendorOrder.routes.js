const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const assignCtrl      = require('../controllers/vendorAssignment.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get   ('/',           ...adminOnly, assignCtrl.getAllVendorOrders);
router.get   ('/:id',        ...adminOnly, assignCtrl.getVendorOrderById);
router.patch ('/:id/status', ...adminOnly, assignCtrl.updateVendorOrderStatus);
router.patch ('/:id/reassign',...adminOnly, assignCtrl.reassignVendor);

module.exports = router;
