const router = require('express').Router();
const contactCtrl = require('../controllers/contact.controller');

/**
 * POST /api/v1/contact
 * Submit contact form (public endpoint)
 */
router.post('/', contactCtrl.submitContactForm);

module.exports = router;
