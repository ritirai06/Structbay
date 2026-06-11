const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/replacement.controller');

const adminOnly  = [protect, requireRole('ADMIN')];
const custOrAdmin = [protect, requireRole('CUSTOMER', 'ADMIN')];

router.post  ('/',              ...custOrAdmin, ctrl.create);
router.get   ('/my',            ...custOrAdmin, ctrl.getMy);
router.get   ('/',              ...adminOnly,   ctrl.getAll);
router.get   ('/:id',           ...adminOnly,   ctrl.getById);
router.patch ('/:id/review',    ...adminOnly,   ctrl.review);

module.exports = router;
