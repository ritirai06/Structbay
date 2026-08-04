const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const SupportTicket = require('../models/SupportTicket');

// ─── ADMIN: Get all tickets ──────────────────────────────────────────────────
exports.getTickets = asyncHandler(async (req, res) => {
  const { status, vendor, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  
  if (req.user.role === 'VENDOR') {
    filter.vendor = req.user._id;
  } else if (vendor) {
    filter.vendor = vendor;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const tickets = await SupportTicket.find(filter)
    .populate('vendor', 'companyName name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await SupportTicket.countDocuments(filter);

  return ApiResponse.success(res, 200, 'Support tickets retrieved.', tickets, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / parseInt(limit))
  });
});

// ─── ADMIN/VENDOR: Get single ticket ──────────────────────────────────────────
exports.getTicketDetails = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('vendor', 'companyName name email phone')
    .populate('responses.sender', 'name companyName');
    
  if (!ticket) return ApiResponse.notFound(res, 'Ticket not found.');

  // If vendor, ensure they own it
  if (req.user.role === 'VENDOR' && ticket.vendor._id.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(res, 'Access denied.');
  }

  return ApiResponse.success(res, 200, 'Ticket details retrieved.', ticket);
});

// ─── ADMIN: Update ticket status ──────────────────────────────────────────────
exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return ApiResponse.badRequest(res, 'status is required.');

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('vendor', 'companyName name email');
  
  if (!ticket) return ApiResponse.notFound(res, 'Ticket not found.');
  
  return ApiResponse.success(res, 200, 'Ticket status updated.', ticket);
});

// ─── ADMIN/VENDOR: Delete ticket ──────────────────────────────────────────────
exports.deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return ApiResponse.notFound(res, 'Ticket not found.');

  if (req.user.role === 'VENDOR' && ticket.vendor.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(res, 'Access denied.');
  }

  await ticket.deleteOne();

  return ApiResponse.success(res, 200, 'Ticket deleted successfully.');
});
