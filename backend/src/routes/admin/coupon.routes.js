const express = require('express');
const {
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon
} = require('../../controllers/coupon.controller');

const router = express.Router();

router.route('/')
  .post(createCoupon)
  .get(getCoupons);

router.route('/:id')
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;
