const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/orderReports.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/summary',              ...adminOnly, ctrl.summary);
router.get('/vendor-fulfillment',   ...adminOnly, ctrl.vendorFulfillment);
router.get('/city-wise',            ...adminOnly, ctrl.cityWise);
router.get('/category-wise',        ...adminOnly, ctrl.categoryWise);
router.get('/invoice-status',       ...adminOnly, ctrl.invoiceStatus);
router.get('/dispatch-performance', ...adminOnly, ctrl.dispatchPerformance);

module.exports = router;
