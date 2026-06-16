const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/order.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/invoices/summary',       ...adminOnly, ctrl.invoiceSummary);
router.get('/invoices',               ...adminOnly, ctrl.listInvoices);
// Register /stats before / so "stats" is never captured as :id.
router.get('/stats',              ...adminOnly, ctrl.getStats);
router.get('/',                   ...adminOnly, ctrl.getAll);
router.post('/',                  ...adminOnly, ctrl.create);
router.patch('/:id/edit',         ...adminOnly, ctrl.patchOrderDetails);
router.patch('/:id/status',       ...adminOnly, ctrl.updateStatus);
router.patch('/:id/assign-vendor',...adminOnly, ctrl.assignVendor);
router.patch('/:id/documents',    ...adminOnly, ctrl.uploadDocs);
router.get('/:id',                ...adminOnly, ctrl.getById);

module.exports = router;
