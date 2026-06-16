const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const RefreshToken = require('../models/tokens/RefreshToken');
const Session = require('../models/Session');
const { USER_STATUS, VENDOR_STATUS, PAGINATION } = require('../config/constants');
const {
  sendVendorApprovedEmail,
  sendVendorRejectedEmail,
} = require('../services/email.service');

const authService = require('../services/auth.service');

// ─── GET /api/v1/admin/users ──────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limitNum),
    User.countDocuments(filter),
  ]);

  return ApiResponse.success(
    res,
    200,
    'Users retrieved.',
    users,
    {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    }
  );
});

// ─── GET /api/v1/admin/users/:id ─────────────────────────────────────────────
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  return ApiResponse.success(res, 200, 'User retrieved.', user);
});

// ─── PUT /api/v1/admin/users/:id/status ───────────────────────────────────────
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Object.values(USER_STATUS).includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${Object.values(USER_STATUS).join(', ')}`, 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('User not found.', 404);

  // On suspend/delete, revoke all tokens
  if (status === USER_STATUS.SUSPENDED || status === USER_STATUS.DELETED) {
    await RefreshToken.revokeAllForUser(user._id);
    await Session.updateMany({ user: user._id, isActive: true }, { isActive: false, logoutAt: new Date() });
  }

  return ApiResponse.success(res, 200, `User status updated to ${status}.`, user);
});

// ─── DELETE /api/v1/admin/users/:id ──────────────────────────────────────────
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  // Soft delete
  user.status = USER_STATUS.DELETED;
  await user.save({ validateBeforeSave: false });
  await RefreshToken.revokeAllForUser(user._id);

  return ApiResponse.success(res, 200, 'User deleted successfully.');
});

// ─── PUT /api/v1/admin/vendors/:id/approve ────────────────────────────────────
const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await User.findOne({ _id: req.params.id, role: 'VENDOR' });
  if (!vendor) throw new AppError('Vendor not found.', 404);

  if (vendor.vendorStatus === VENDOR_STATUS.APPROVED) {
    throw new AppError('Vendor is already approved.', 400);
  }

  vendor.vendorStatus = VENDOR_STATUS.APPROVED;
  vendor.status = USER_STATUS.ACTIVE;
  vendor.isEmailVerified = true;
  vendor.vendorApprovedBy = req.user._id;
  vendor.vendorApprovedAt = new Date();
  vendor.vendorRejectionReason = null;
  if (!vendor.referenceNumber) {
    const { generateRefNumber } = require('../services/refNumber.service');
    try {
      vendor.referenceNumber = await generateRefNumber('VENDOR');
    } catch {
      /* non-blocking */
    }
  }
  await vendor.save({ validateBeforeSave: false });

  await sendVendorApprovedEmail({
    to: vendor.email,
    name: vendor.name,
    companyName: vendor.companyName,
  });

  return ApiResponse.success(res, 200, 'Vendor approved successfully.', {
    id: vendor._id,
    name: vendor.name,
    vendorStatus: vendor.vendorStatus,
    status: vendor.status,
  });
});

// ─── PUT /api/v1/admin/vendors/:id/reject ─────────────────────────────────────
const rejectVendor = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const vendor = await User.findOne({ _id: req.params.id, role: 'VENDOR' });
  if (!vendor) throw new AppError('Vendor not found.', 404);

  vendor.vendorStatus = VENDOR_STATUS.REJECTED;
  vendor.status = USER_STATUS.REJECTED;
  vendor.vendorRejectionReason = reason || null;
  await vendor.save({ validateBeforeSave: false });

  await sendVendorRejectedEmail({
    to: vendor.email,
    name: vendor.name,
    companyName: vendor.companyName,
    reason,
  });

  return ApiResponse.success(res, 200, 'Vendor rejected.', {
    id: vendor._id,
    name: vendor.name,
    vendorStatus: vendor.vendorStatus,
  });
});

// ─── GET /api/v1/admin/vendors ────────────────────────────────────────────────
const getAllVendors = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    vendorStatus,
    search,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const filter = { role: 'VENDOR' };
  const andParts = [];

  /** Dropdowns (e.g. order assignment) use APPROVED — include legacy rows with null vendorStatus but active account. */
  if (vendorStatus === 'APPROVED') {
    andParts.push({
      $or: [
        { vendorStatus: 'APPROVED' },
        { vendorStatus: null, status: 'ACTIVE' },
      ],
    });
  } else if (vendorStatus) {
    andParts.push({ vendorStatus });
  }

  if (search) {
    andParts.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (andParts.length === 1) Object.assign(filter, andParts[0]);
  else if (andParts.length > 1) filter.$and = andParts;

  const [vendors, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Vendors retrieved.', vendors, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// ─── POST /api/v1/admin/vendors ───────────────────────────────────────────────
const createVendor = asyncHandler(async (req, res) => {
  const user = await authService.createVendorByAdmin(req.body, req.user);
  return ApiResponse.created(
    res,
    'Vendor account created. They can sign in with the password you set.',
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      vendorStatus: user.vendorStatus,
      status: user.status,
      companyName: user.companyName,
    }
  );
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  approveVendor,
  rejectVendor,
  getAllVendors,
  createVendor,
};
