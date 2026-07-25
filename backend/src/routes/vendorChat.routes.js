const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/vendorChat.controller');

const adminOnly   = [protect, requireRole('ADMIN')];
const authenticated = [protect, requireRole('VENDOR', 'ADMIN')];

// Admin: view all vendor chats
router.get('/',                         ...adminOnly,    ctrl.getAllChats);
// Per-order: both vendor and admin
router.get('/:vendorOrderId',           ...authenticated, ctrl.getChat);
router.post('/:vendorOrderId/messages', ...authenticated, ctrl.sendMessage);

module.exports = router;
