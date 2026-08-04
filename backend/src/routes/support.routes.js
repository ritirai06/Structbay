const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const supportCtrl = require('../controllers/support.controller');

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────
const adminGuard = [protect, requireRole('ADMIN')];

router.patch('/:id/status', ...adminGuard, supportCtrl.updateTicketStatus);

// ─── ADMIN & VENDOR SHARED ROUTES ─────────────────────────────────────────────
const sharedGuard = [protect, requireRole('ADMIN', 'VENDOR')];

router.get('/', ...sharedGuard, supportCtrl.getTickets);
router.get('/:id', ...sharedGuard, supportCtrl.getTicketDetails);
router.delete('/:id', ...sharedGuard, supportCtrl.deleteTicket);

module.exports = router;
