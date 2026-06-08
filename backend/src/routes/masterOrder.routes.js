const router = require('express').Router();
const { protect }      = require('../middleware/auth.middleware');
const { requireRole }  = require('../middleware/role.middleware');
const masterCtrl       = require('../controllers/masterOrder.controller');
const assignCtrl       = require('../controllers/vendorAssignment.controller');
const docCtrl          = require('../controllers/orderDocument.controller');

const adminOnly = [protect, requireRole('ADMIN')];

// ─── Master Orders ────────────────────────────────────────────────────────────
router.get   ('/',                   ...adminOnly, masterCtrl.getAll);
router.get   ('/stats',              ...adminOnly, masterCtrl.getStats);
router.post  ('/',                   ...adminOnly, masterCtrl.create);
router.get   ('/:id',                ...adminOnly, masterCtrl.getById);
router.patch ('/:id/edit',           ...adminOnly, masterCtrl.editOrder);
router.patch ('/:id/status',         ...adminOnly, masterCtrl.updateStatus);
router.post  ('/:id/cancel',         ...adminOnly, masterCtrl.cancelOrder);
router.post  ('/:id/split',          ...adminOnly, masterCtrl.splitOrder);
router.patch ('/:id/add-note',       ...adminOnly, masterCtrl.addNote);

// ─── Vendor Assignment (per order) ───────────────────────────────────────────
router.post  ('/:id/vendor-assignments',  ...adminOnly, assignCtrl.assignVendors);
router.get   ('/:id/vendor-assignments',  ...adminOnly, assignCtrl.getAssignments);

module.exports = router;
