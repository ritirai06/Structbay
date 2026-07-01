const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { simulateMockPayment } = require('../../controllers/payment.controller');

const router = express.Router();

router.post('/mock/simulate', protect, simulateMockPayment);

module.exports = router;
