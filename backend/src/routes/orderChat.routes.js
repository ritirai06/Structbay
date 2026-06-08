const router = require('express').Router();
const { protect }     = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl            = require('../controllers/orderChat.controller');

const adminOnly   = [protect, requireRole('ADMIN')];
const authenticated = [protect, requireRole('CUSTOMER', 'ADMIN')];

// Admin: view all chats
router.get('/',                         ...adminOnly,    ctrl.getAllChats);
// Per-order: both customer and admin
router.get('/:orderId',                 ...authenticated, ctrl.getChat);
router.post('/:orderId/messages',       ...authenticated, ctrl.sendMessage);

module.exports = router;
