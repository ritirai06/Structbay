const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/productRelationship.controller');

const adminOnly = [protect, requireRole('ADMIN')];

// Get relationships for a product (admin)
router.get('/product/:id', ...adminOnly, ctrl.getRelationships);

// Save relationships for a product (admin)
router.post('/product/:id', ...adminOnly, ctrl.saveRelationships);

// Remove a specific relationship (admin)
router.delete('/:id/:relatedId/:type', ...adminOnly, ctrl.removeRelationship);

// Public endpoints for storefront
// Get upsell products for cart (used by cart API)
router.get('/upsell', ctrl.getUpsellProducts);

// Get cross-sell products for product detail page
router.get('/cross-sell/:productId', ctrl.getCrossSellProducts);

module.exports = router;