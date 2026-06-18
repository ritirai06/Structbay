const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const ConcreteRFQ = require('../models/ConcreteRFQ');
const User = require('../models/User');
const { ROLES } = require('../config/constants');
const { logAction } = require('../services/auditLog.service');
const { generateConcreteRfqNumber } = require('../services/refNumber.service');
const { sendEmail } = require('../services/email.service');

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const genNumber = () => generateConcreteRfqNumber();

const getAll = asyncHandler(async (req, res) => {
  const { status, city, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (city) filter.city = { $regex: city, $options: 'i' };
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const [items, total] = await Promise.all([
    ConcreteRFQ.find(filter)
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    ConcreteRFQ.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'RFQs retrieved.', items, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const item = await ConcreteRFQ.findById(req.params.id)
    .populate('customer', 'name email phone')
    .populate('assignedTo', 'name email');
  if (!item) throw new AppError('RFQ not found.', 404);
  return ApiResponse.success(res, 200, 'RFQ retrieved.', item);
});

const create = asyncHandler(async (req, res) => {
  const rfqNumber = await genNumber();
  const body = { ...req.body };
  delete body.customer;
  if (body.siteAddress && !body.location) body.location = body.siteAddress;
  const payload = { ...body, rfqNumber };
  if (req.user?._id) payload.customer = req.user._id;
  const item = await ConcreteRFQ.create(payload);
  return ApiResponse.created(res, 'RFQ submitted.', item);
});

const update = asyncHandler(async (req, res) => {
  const item = await ConcreteRFQ.findById(req.params.id);
  if (!item) throw new AppError('RFQ not found.', 404);

  const prevStatus = item.status;
  const prevAssignedStr = item.assignedTo ? item.assignedTo.toString() : '';

  if (req.body.status !== undefined) {
    item.status = req.body.status;
  }

  if (req.body.assignedTo !== undefined) {
    const raw = req.body.assignedTo;
    if (raw === null || raw === '' || raw === undefined) {
      item.assignedTo = null;
    } else {
      const assignee = await User.findById(raw).select('role name email');
      if (!assignee) throw new AppError('Assignee not found.', 404);
      if (assignee.role !== ROLES.ADMIN) {
        throw new AppError('RFQ can only be assigned to an admin (internal) user.', 400);
      }
      item.assignedTo = assignee._id;
    }
  }

  if (req.body.quotationUrl !== undefined) item.quotationUrl = req.body.quotationUrl;
  if (req.body.adminNotes !== undefined) item.adminNotes = req.body.adminNotes;

  const newAssignedStr = item.assignedTo ? item.assignedTo.toString() : '';
  const statusChanged = req.body.status !== undefined && String(req.body.status) !== String(prevStatus);
  const assignChanged =
    req.body.assignedTo !== undefined && newAssignedStr !== prevAssignedStr;

  await item.save();

  const fresh = await ConcreteRFQ.findById(item._id)
    .populate('assignedTo', 'name email')
    .populate('customer', 'name email phone');

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'ConcreteRFQ',
    targetId: item._id.toString(),
    description: `Updated RFQ: ${item.rfqNumber}${statusChanged ? ` status→${item.status}` : ''}${assignChanged ? ' assignment' : ''}`,
    ipAddress: req.ip,
  });

  const toEmail = (fresh.customerEmail || fresh.customer?.email || '').trim();
  if ((statusChanged || assignChanged) && toEmail) {
    const assigneeName =
      fresh.assignedTo && typeof fresh.assignedTo === 'object' && fresh.assignedTo.name
        ? fresh.assignedTo.name
        : null;
    const lines = [];
    if (statusChanged) {
      lines.push(`<p><strong>Status:</strong> ${escapeHtml(prevStatus)} → <strong>${escapeHtml(item.status)}</strong></p>`);
    }
    if (assignChanged) {
      lines.push(
        assigneeName
          ? `<p><strong>Your request is now handled by:</strong> ${escapeHtml(assigneeName)} (StructBay team).</p>`
          : '<p><strong>Assignment:</strong> Your RFQ is open for routing; a team member will pick it up shortly.</p>'
      );
    }
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#1a1a1a">
        <p>Hi ${escapeHtml(fresh.customerName)},</p>
        <p>We have an update on your <strong>concrete RFQ</strong> <strong>${escapeHtml(fresh.rfqNumber)}</strong> (${escapeHtml(fresh.grade)}, ${escapeHtml(String(fresh.quantity))} m³, ${escapeHtml(fresh.city)}).</p>
        ${lines.join('')}
        <p>If you have questions, reply to this email or contact us with your RFQ number handy.</p>
        <p style="color:#666;font-size:13px">— StructBay</p>
      </div>`;
    await sendEmail({
      to: toEmail,
      subject: `StructBay update — RFQ ${fresh.rfqNumber}`,
      html,
    });
  }

  return ApiResponse.success(res, 200, 'RFQ updated.', fresh);
});

const getStats = asyncHandler(async (req, res) => {
  const active = { isDeleted: false };
  const [total, pending, inProgress, quoted, converted] = await Promise.all([
    ConcreteRFQ.countDocuments(active),
    ConcreteRFQ.countDocuments({ ...active, status: 'PENDING' }),
    ConcreteRFQ.countDocuments({ ...active, status: 'IN_PROGRESS' }),
    ConcreteRFQ.countDocuments({ ...active, status: 'QUOTED' }),
    ConcreteRFQ.countDocuments({ ...active, status: 'CONVERTED' }),
  ]);
  return ApiResponse.success(res, 200, 'Stats.', { total, pending, inProgress, quoted, converted });
});

const remove = asyncHandler(async (req, res) => {
  const item = await ConcreteRFQ.findById(req.params.id);
  if (!item) throw new AppError('RFQ not found.', 404);
  item.isDeleted = true;
  await item.save();
  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'ConcreteRFQ',
    targetId: item._id.toString(),
    description: `Soft-deleted concrete RFQ ${item.rfqNumber}`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'RFQ deleted.', { id: item._id });
});

const bulkRemove = asyncHandler(async (req, res) => {
  const raw = req.body?.ids;
  const ids = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : [];
  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!objectIds.length) throw new AppError('No valid RFQ ids provided.', 400);
  const result = await ConcreteRFQ.updateMany(
    { _id: { $in: objectIds }, isDeleted: { $ne: true } },
    { $set: { isDeleted: true } }
  );
  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'ConcreteRFQ',
    targetId: ids.slice(0, 20).join(','),
    description: `Bulk soft-deleted ${result.modifiedCount} concrete RFQ(s)`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, `${result.modifiedCount} RFQ(s) deleted.`, {
    modifiedCount: result.modifiedCount,
  });
});

module.exports = { getAll, getById, create, update, getStats, remove, bulkRemove };
