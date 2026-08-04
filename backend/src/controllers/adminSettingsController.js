const GlobalSettings = require('../models/GlobalSettings');
const ApiResponse = require('../utils/apiResponse');

/**
 * Helper to get or create the singleton settings document
 */
async function getOrCreateSettings() {
  let doc = await GlobalSettings.findOne({ key: 'GLOBAL' });
  if (!doc) {
    doc = await GlobalSettings.create({ key: 'GLOBAL' });
  }
  return doc;
}

// @desc    Get Global Settings
// @route   GET /api/v1/admin/settings
exports.getSettings = async (req, res) => {
  const settings = await getOrCreateSettings();
  return ApiResponse.success(res, 200, 'Settings retrieved.', settings);
};

// @desc    Update Global Settings
// @route   PUT /api/v1/admin/settings
exports.updateSettings = async (req, res) => {
  const allowedUpdates = [
    'siteName', 'supportEmail', 'supportPhone',
    'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass',
    'orderNotifications', 'lowStockAlerts', 'rfqNotifications', 'dailyReports',
    'razorpayKey', 'razorpaySecret', 'testMode',
    'gstNumber', 'panNumber', 'inclusivePricing'
  ];

  const updateData = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  const settings = await GlobalSettings.findOneAndUpdate(
    { key: 'GLOBAL' },
    { $set: updateData },
    { new: true, upsert: true }
  );

  return ApiResponse.success(res, 200, 'Settings updated successfully.', settings);
};
