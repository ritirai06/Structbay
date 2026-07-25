const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const VendorChat   = require('../models/VendorChat');
const VendorOrder  = require('../models/VendorOrder');

const ensureChat = async (vendorOrderId, vendorId) => {
  let chat = await VendorChat.findOne({ vendorOrder: vendorOrderId });
  if (!chat) {
    chat = await VendorChat.create({ vendorOrder: vendorOrderId, vendor: vendorId });
  }
  return chat;
};

// GET /vendor-chat/:vendorOrderId
exports.getChat = asyncHandler(async (req, res) => {
  const { vendorOrderId } = req.params;

  const vo = await VendorOrder.findById(vendorOrderId).select('vendor');
  if (!vo) throw new AppError('Vendor order not found.', 404);

  const isAdmin = req.user.role === 'ADMIN';
  const isVendor = vo.vendor.toString() === req.user._id.toString();
  if (!isAdmin && !isVendor) throw new AppError('Access denied.', 403);

  const chat = await ensureChat(vendorOrderId, vo.vendor);

  if (isAdmin) {
    await VendorChat.findByIdAndUpdate(chat._id, {
      'messages.$[el].isRead': true, unreadByAdmin: 0,
    }, { arrayFilters: [{ 'el.senderType': 'VENDOR', 'el.isRead': false }] });
  } else {
    await VendorChat.findByIdAndUpdate(chat._id, {
      'messages.$[el].isRead': true, unreadByVendor: 0,
    }, { arrayFilters: [{ 'el.senderType': 'ADMIN', 'el.isRead': false }] });
  }

  const refreshed = await VendorChat.findById(chat._id).populate('vendor', 'name email companyName');
  return ApiResponse.success(res, 200, 'Vendor chat retrieved.', refreshed);
});

// POST /vendor-chat/:vendorOrderId/messages
exports.sendMessage = asyncHandler(async (req, res) => {
  const { vendorOrderId } = req.params;
  const { text, attachments = [] } = req.body;

  if (!text && !attachments.length) throw new AppError('Message text or attachment required.', 400);

  const vo = await VendorOrder.findById(vendorOrderId).select('vendor orderNumber');
  if (!vo) throw new AppError('Vendor order not found.', 404);

  const isAdmin = req.user.role === 'ADMIN';
  const isVendor = vo.vendor.toString() === req.user._id.toString();
  if (!isAdmin && !isVendor) throw new AppError('Access denied.', 403);

  const senderType = isAdmin ? 'ADMIN' : 'VENDOR';
  const message = { senderType, sender: req.user._id, text, attachments, isRead: false, sentAt: new Date() };

  const chat = await VendorChat.findOneAndUpdate(
    { vendorOrder: vendorOrderId },
    {
      $push: { messages: message },
      $set:  { lastMessageAt: new Date() },
      $inc:  { [isAdmin ? 'unreadByVendor' : 'unreadByAdmin']: 1 },
    },
    { new: true, upsert: true }
  );

  return ApiResponse.success(res, 200, 'Message sent.', chat.messages[chat.messages.length - 1]);
});

// GET /vendor-chat (admin only - all chats)
exports.getAllChats = asyncHandler(async (req, res) => {
  const { unread, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (unread === 'true') filter.unreadByAdmin = { $gt: 0 };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const [chats, total] = await Promise.all([
    VendorChat.find(filter)
      .populate('vendor', 'name email phone companyName')
      .populate('vendorOrder', 'orderNumber status')
      .sort({ lastMessageAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    VendorChat.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Vendor chats retrieved.', chats, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});
