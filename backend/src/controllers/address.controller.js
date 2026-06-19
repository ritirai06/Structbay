const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const Address      = require('../models/Address');

// GET /customer/addresses
exports.getAll = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ customer: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  return ApiResponse.success(res, 200, 'Addresses retrieved.', addresses);
});

// POST /customer/addresses
exports.create = asyncHandler(async (req, res) => {
  const { name, companyName, phone, email, gstNumber, line1, line2, landmark, city, state, pincode, label, isDefault } = req.body;

  // If new address is default, unset others
  if (isDefault) {
    await Address.updateMany({ customer: req.user._id }, { isDefault: false });
  }

  const address = await Address.create({
    customer: req.user._id,
    name, companyName, phone, email, gstNumber,
    line1, line2, landmark, city, state, pincode,
    label: label || 'Home',
    isDefault: !!isDefault,
  });

  return ApiResponse.created(res, 'Address saved.', address);
});

// PATCH /customer/addresses/:id
exports.update = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, customer: req.user._id });
  if (!address) throw new AppError('Address not found.', 404);

  if (req.body.isDefault) {
    await Address.updateMany({ customer: req.user._id }, { isDefault: false });
  }

  const allowed = ['name','companyName','phone','email','gstNumber','line1','line2','landmark','city','state','pincode','label','isDefault'];
  allowed.forEach(f => { if (req.body[f] !== undefined) address[f] = req.body[f]; });
  await address.save();
  return ApiResponse.success(res, 200, 'Address updated.', address);
});

// PATCH /customer/addresses/:id/set-default
exports.setDefault = asyncHandler(async (req, res) => {
  await Address.updateMany({ customer: req.user._id }, { isDefault: false });
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isDefault: true },
    { new: true }
  );
  if (!address) throw new AppError('Address not found.', 404);
  return ApiResponse.success(res, 200, 'Default address set.', address);
});

// DELETE /customer/addresses/:id
exports.remove = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, customer: req.user._id });
  if (!address) throw new AppError('Address not found.', 404);
  await address.deleteOne();
  return ApiResponse.success(res, 200, 'Address deleted.');
});
