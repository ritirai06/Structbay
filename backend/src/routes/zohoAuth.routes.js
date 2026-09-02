const express = require('express');
const { zohoCallback } = require('../controllers/zohoAuth.controller');
const { handleWebhook } = require('../controllers/zohoWebhook.controller');

const router = express.Router();

// Maps to /api/payment/zoho/callback when mounted at /api/payment
router.get('/zoho/callback', zohoCallback);

// Maps to /api/payment/zoho/webhook
router.post('/zoho/webhook', handleWebhook);

module.exports = router;
