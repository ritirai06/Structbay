const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/city.controller');

const adminOnly = [protect, requireRole('ADMIN')];

router.get('/',               ctrl.getAll);
router.post('/bulk-import',  ...adminOnly, ctrl.bulkImport);
router.post('/:id/pins/bulk-import', ...adminOnly, ctrl.bulkImportPincodes);
router.get('/:id',            ctrl.getById);
router.post('/',              ...adminOnly, ctrl.create);
router.patch('/:id',          ...adminOnly, ctrl.update);
router.patch('/:id/toggle',   ...adminOnly, ctrl.toggle);
router.delete('/:id',         ...adminOnly, ctrl.remove);

module.exports = router;
