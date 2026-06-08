const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const OrderChat    = require('../models/OrderChat');
const Order        = require('../models/Order');

// ─── Ensure chat exists for order ─────────────────────────────────────────────
const ensureChat = async (masterOrderId, customerId) => {
  let chat = await OrderChat.findOne({ masterOrder: masterOrderId });
  if (!chat) {
    chat = await OrderChat.create({ masterOrder: masterOrderId, customer: customerId });
  }
  return chat;
};

// ─── GET /order-chat/:orderId ─────────────────────────────────────────────────
exports.getChat = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Validate access
  const order = await Order.findById(orderId).select('customer');
  if (!order) throw new AppError('Order not found.', 404);

  const isAdmin    = req.user.role === 'ADMIN';
  const isCustomer = order.customer.toString() === req.user._id.toString();
  if (!isAdmin && !isCustomer) throw new AppError('Access denied.', 403);

  const chat = await ensureChat(orderId, order.customer);

  // Mark messages as read
  if (isAdmin) {
    await OrderChat.findByIdAndUpdate(chat._id, {
      'messages.$[el].isRead': true, unreadByAdmin: 0,
    }, { arrayFilters: [{ 'el.senderType': 'CUSTOMER', 'el.isRead': false }] });
  } else {
    await OrderChat.findByIdAndUpdate(chat._id, {
      'messages.$[el].isRead': true, unreadByCustomer: 0,
    }, { arrayFilters: [{ 'el.senderType': 'ADMIN', 'el.isRead': false }] });
  }

  const refreshed = await OrderChat.findById(chat._id).populate('customer', 'name email');
  return ApiResponse.success(res, 200, 'Chat retrieved.', refreshed);
});

// ─── POST /order-chat/:orderId/messages ───────────────────────────────────────
exports.sendMessage = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { text, attachments = [] } = req.body;

  if (!text && !attachments.length) throw new AppError('Message text or attachment required.', 400);

  const order = await Order.findById(orderId).select('customer');
  if (!order) throw new AppError('Order not found.', 404);

  const isAdmin    = req.user.role === 'ADMIN';
  const isCustomer = order.customer.toString() === req.user._id.toString();
  if (!isAdmin && !isCustomer) throw new AppError('Access denied.', 403);

  const senderType = isAdmin ? 'ADMIN' : 'CUSTOMER';
  const message = { senderType, sender: req.user._id, text, attachments, isRead: false, sentAt: new Date() };

  const chat = await OrderChat.findOneAndUpdate(
    { masterOrder: orderId },
    {
      $push: { messages: message },
      $set:  { lastMessageAt: new Date() },
      $inc:  { [isAdmin ? 'unreadByCustomer' : 'unreadByAdmin']: 1 },
    },
    { new: true, upsert: true }
  );

  return ApiResponse.success(res, 200, 'Message sent.', chat.messages[chat.messages.length - 1]);
});

// ─── GET /order-chat (admin — all chats) ──────────────────────────────────────
exports.getAllChats = asyncHandler(async (req, res) => {
  const { unread, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (unread === 'true') filter.unreadByAdmin = { $gt: 0 };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const [chats, total] = await Promise.all([
    OrderChat.find(filter)
      .populate('customer', 'name email phone')
      .populate('masterOrder', 'orderNumber status')
      .sort({ lastMessageAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    OrderChat.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Chats retrieved.', chats, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});
