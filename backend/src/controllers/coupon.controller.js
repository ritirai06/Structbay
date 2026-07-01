const Coupon = require('../models/Coupon');

/**
 * @desc    Create a new coupon
 * @route   POST /api/v1/admin/coupons
 * @access  Private/Admin
 */
exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all coupons
 * @route   GET /api/v1/admin/coupons
 * @access  Private/Admin
 */
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single coupon
 * @route   GET /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update coupon
 * @route   PUT /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete coupon
 * @route   DELETE /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    await coupon.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Validate a coupon
 * @route   POST /api/v1/coupons/validate
 * @access  Public (or Private depending on requirements)
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartValue } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide a coupon code' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid Coupon Code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: 'Coupon is inactive' });
    }

    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return res.status(400).json({ success: false, message: 'Coupon is not yet valid' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
      return res.status(400).json({ success: false, message: 'Coupon Expired' });
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded' });
    }

    if (cartValue !== undefined && coupon.minCartValue && cartValue < coupon.minCartValue) {
      return res.status(400).json({ success: false, message: `Minimum order value for this coupon is ₹${coupon.minCartValue}` });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon Applied Successfully',
      data: {
        code: coupon.code,
        type: coupon.type,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        minCartValue: coupon.minCartValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
