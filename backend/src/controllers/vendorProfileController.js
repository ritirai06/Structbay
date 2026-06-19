const User = require('../models/User');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');

// @desc    Get Vendor Profile
// @route   GET /api/v1/vendor/profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  return ApiResponse.success(res, 200, 'Profile retrieved.', user);
};

// @desc    Update Vendor Profile
// @route   PUT /api/v1/vendor/profile
exports.updateProfile = async (req, res) => {
  const allowed = [
    'name', 'phone', 'companyName', 'contactPerson',
    'gstNumber', 'panNumber', 'businessRegNumber',
  ];

  // Allow nested vendorAddress & bankDetails
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.body.officeAddress) updates.officeAddress = req.body.officeAddress;
  if (req.body.bankDetails)   updates.bankDetails   = req.body.bankDetails;
  if (req.body.notifications) updates.notifications = req.body.notifications;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
  });

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'profile_update',
    description: 'Vendor profile updated',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return ApiResponse.success(res, 200, 'Profile updated.', user);
};

// @desc    Upload Profile Image
// @route   POST /api/v1/vendor/profile/image
exports.uploadProfileImage = async (req, res) => {
  if (!req.file) return ApiResponse.badRequest(res, 'No image uploaded.');

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { profileImage: { url: req.file.path, publicId: req.file.filename } },
    { new: true }
  );

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'profile_update',
    description: 'Profile image updated',
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Profile image updated.', { profileImage: user.profileImage });
};
