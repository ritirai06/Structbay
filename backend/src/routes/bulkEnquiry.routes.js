const router = require('express').Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/bulkEnquiry.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/template/excel', ctrl.downloadExcelTemplate);
router.get('/template/pdf', ctrl.downloadPdfTemplate);
router.get('/template/example-text', ctrl.getTextExample);

router.get('/',        ...adminOnly, ctrl.getAll);
router.get('/stats',   ...adminOnly, ctrl.getStats);
router.get('/:id',     ...adminOnly, ctrl.getById);
router.post('/',       optionalAuth, ctrl.create);
router.patch('/:id',   ...adminOnly, ctrl.update);

module.exports = router;
