const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Session = require('../models/Session');
const RefreshToken = require('../models/tokens/RefreshToken');
const { PAGINATION } = require('../config/constants');

// ─── GET /api/v1/admin/sessions ───────────────────────────────────────────────
const getAllSessions = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    isActive,
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip     = (pageNum - 1) * limitNum;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .populate('user', 'name email role')
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Session.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Sessions retrieved.', sessions, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// ─── GET /api/v1/admin/sessions/user/:id ─────────────────────────────────────
const getUserSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.params.id })
    .sort({ loginAt: -1 })
    .limit(50);
  return ApiResponse.success(res, 200, 'User sessions retrieved.', sessions);
});

// ─── DELETE /api/v1/admin/sessions/:id ───────────────────────────────────────
const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) throw new AppError('Session not found.', 404);

  session.isActive  = false;
  session.logoutAt  = new Date();
  await session.save();

  if (session.refreshTokenId) {
    await RefreshToken.findByIdAndUpdate(session.refreshTokenId, { isRevoked: true });
  }

  return ApiResponse.success(res, 200, 'Session revoked.');
});

module.exports = { getAllSessions, getUserSessions, revokeSession };
