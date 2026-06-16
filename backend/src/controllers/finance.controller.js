const asyncHandler      = require('../utils/asyncHandler');
const ApiResponse       = require('../utils/apiResponse');
const FinanceLead       = require('../models/FinanceLead');
const FinanceDocument   = require('../models/FinanceDocument');
const { uploadDocument } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS } = require('../config/constants');
const communicationSvc  = require('../services/communication.service');
const { auditAction }   = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');
const AppError          = require('../utils/AppError');

const PAGE  = (q) => Math.max(1, parseInt(q.page)  || 1);
const LIMIT = (q) => Math.min(100, parseInt(q.limit) || 20);

// ─── Submit Finance Application (public / customer) ──────────────────────────
exports.submitApplication = asyncHandler(async (req, res) => {
  const {
    name, companyName, mobile, email, gstNumber,
    businessType, projectType, projectLocation,
    loanAmountRequired, purposeOfLoan, monthlyTurnover, remarks,
  } = req.body;

  if (!name || !String(name).trim()) throw new AppError('Name is required.', 400);
  if (!mobile || !String(mobile).trim()) throw new AppError('Mobile number is required.', 400);

  const parseMoney = (v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
  };

  const loanNum = parseMoney(loanAmountRequired);
  const turnoverNum = parseMoney(monthlyTurnover);

  const financeNumber = await generateRefNumber('FINANCE');

  const customerId =
    req.user && req.user.role === 'CUSTOMER' ? req.user._id : null;

  const allowedBiz = ['proprietorship', 'partnership', 'pvtltd', 'llp', 'other'];
  const biz =
    businessType && allowedBiz.includes(String(businessType).toLowerCase())
      ? String(businessType).toLowerCase()
      : undefined;

  let extraRemarks = remarks ? String(remarks).trim() : '';
  if (req.body.projectValue != null && String(req.body.projectValue).trim()) {
    const pv = String(req.body.projectValue).trim();
    extraRemarks = extraRemarks
      ? `${extraRemarks}\n\nProject value (₹): ${pv}`
      : `Project value (₹): ${pv}`;
  }

  const lead = await FinanceLead.create({
    financeNumber,
    name: String(name).trim(),
    companyName: companyName ? String(companyName).trim() : undefined,
    mobile: String(mobile).trim(),
    email: email ? String(email).trim().toLowerCase() : undefined,
    gstNumber: gstNumber ? String(gstNumber).trim().toUpperCase() : undefined,
    businessType: biz,
    projectType: projectType ? String(projectType).trim() : undefined,
    projectLocation: projectLocation ? String(projectLocation).trim() : undefined,
    loanAmountRequired: loanNum,
    purposeOfLoan: purposeOfLoan ? String(purposeOfLoan).trim() : undefined,
    monthlyTurnover: turnoverNum,
    remarks: extraRemarks || undefined,
    customer: customerId,
    status: 'NEW',
    statusHistory: [{ status: 'NEW', note: 'Application submitted.', changedAt: new Date() }],
  });

  // Notify applicant
  if (email || mobile) {
    communicationSvc.notifyFinanceApp({
      to: { email, phone: mobile },
      vars: {
        customerName: name,
        applicationId: financeNumber,
        financeNumber,
      },
      recipientRef: lead._id,
    }).catch(() => {});
  }

  return ApiResponse.created(res, 'Finance application submitted successfully.', {
    financeNumber: lead.financeNumber,
    applicationReference: lead.financeNumber,
  });
});

// ─── Upload Documents (multi-file) ───────────────────────────────────────────
exports.uploadDocuments = asyncHandler(async (req, res) => {
  const lead = await FinanceLead.findById(req.params.id);
  if (!lead) throw new AppError('Finance lead not found.', 404);

  const { documentType } = req.body;
  if (!req.files?.length) return ApiResponse.badRequest(res, 'No files uploaded.');

  const docs = await FinanceDocument.insertMany(
    req.files.map((f) => ({
      financeLead:  lead._id,
      documentType: documentType || 'OTHER',
      label:        f.originalname,
      url:          f.path,
      cloudinaryId: f.filename,
      mimeType:     f.mimetype,
      fileSize:     f.size,
      uploadedBy:   req.user?._id,
    }))
  );

  await FinanceLead.findByIdAndUpdate(lead._id, { $push: { documents: { $each: docs.map((d) => d._id) } } });

  return ApiResponse.success(res, 200, 'Documents uploaded.', docs);
});

// ─── Admin — List Leads ───────────────────────────────────────────────────────
exports.getLeads = asyncHandler(async (req, res) => {
  const { status, assignedTo, search } = req.query;
  const page = PAGE(req.query);
  const limit = LIMIT(req.query);

  const filter = {};
  if (status)     filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    filter.$or = [
      { financeNumber: rx },
      { name: rx },
      { companyName: rx },
      { mobile: rx },
    ];
  }

  const [leads, total] = await Promise.all([
    FinanceLead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('customer', 'name email mobile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    FinanceLead.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Finance leads retrieved.', leads, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

// ─── Admin — Get Single Lead ──────────────────────────────────────────────────
exports.getLeadById = asyncHandler(async (req, res) => {
  const lead = await FinanceLead.findById(req.params.id)
    .populate('assignedTo', 'name email')
    .populate('customer',   'name email mobile')
    .populate('documents');
  if (!lead) throw new AppError('Finance lead not found.', 404);
  return ApiResponse.success(res, 200, 'Finance lead retrieved.', lead);
});

// ─── Admin — Update Status ────────────────────────────────────────────────────
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note, disbursedAmount } = req.body;
  const lead = await FinanceLead.findById(req.params.id);
  if (!lead) throw new AppError('Finance lead not found.', 404);

  const $set = { status };
  if (status === 'DISBURSED') {
    $set.disbursedAmount = disbursedAmount;
    $set.disbursedAt = new Date();
  }

  const updated = await FinanceLead.findByIdAndUpdate(
    req.params.id,
    {
      $set,
      $push: {
        statusHistory: {
          status,
          changedBy: req.user._id,
          note,
          changedAt: new Date(),
        },
      },
    },
    { new: true }
  );
  await auditAction(req.user._id, 'FINANCE_STATUS_UPDATE', { leadId: lead._id, status });

  return ApiResponse.success(res, 200, 'Lead status updated.', updated);
});

// ─── Admin — Assign Lead ──────────────────────────────────────────────────────
exports.assignLead = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const lead = await FinanceLead.findByIdAndUpdate(
    req.params.id,
    { assignedTo },
    { new: true }
  ).populate('assignedTo', 'name email');
  if (!lead) throw new AppError('Finance lead not found.', 404);
  await auditAction(req.user._id, 'FINANCE_ASSIGN', { leadId: lead._id, assignedTo });
  return ApiResponse.success(res, 200, 'Lead assigned.', lead);
});

// ─── Admin — Add Internal Note ────────────────────────────────────────────────
exports.addNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const lead = await FinanceLead.findByIdAndUpdate(
    req.params.id,
    { internalNotes: note },
    { new: true }
  );
  if (!lead) throw new AppError('Finance lead not found.', 404);
  return ApiResponse.success(res, 200, 'Note updated.', { internalNotes: lead.internalNotes });
});

// ─── Admin — Verify Document ──────────────────────────────────────────────────
exports.verifyDocument = asyncHandler(async (req, res) => {
  const { verified, rejectionReason } = req.body;
  const doc = await FinanceDocument.findByIdAndUpdate(
    req.params.docId,
    {
      isVerified: verified,
      verifiedBy: req.user._id,
      verifiedAt: verified ? new Date() : null,
      rejectionReason: verified ? null : rejectionReason,
    },
    { new: true }
  );
  if (!doc) throw new AppError('Document not found.', 404);
  return ApiResponse.success(res, 200, 'Document verification updated.', doc);
});

// ─── Admin — Finance Dashboard Stats ─────────────────────────────────────────
exports.getDashboard = asyncHandler(async (req, res) => {
  const [total, byStatus, monthly] = await Promise.all([
    FinanceLead.countDocuments(),
    FinanceLead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    FinanceLead.aggregate([
      { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          totalLoanAmount: { $sum: '$loanAmountRequired' },
      }},
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
  ]);

  const statusMap = byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
  const approved  = statusMap.APPROVED  || 0;
  const convRate  = total ? ((approved / total) * 100).toFixed(1) : 0;

  return ApiResponse.success(res, 200, 'Finance dashboard data.', {
    total,
    statusMap,
    conversionRate: convRate,
    monthly,
  });
});

// ─── Admin — Export Leads CSV ─────────────────────────────────────────────────
exports.exportLeads = asyncHandler(async (req, res) => {
  const leads = await FinanceLead.find({})
    .populate('assignedTo', 'name email')
    .lean();

  const header = 'FinanceNumber,Name,Company,Mobile,Email,GST,Business,Project,Location,LoanAmount,Status,CreatedAt\n';
  const rows   = leads.map((l) => [
    l.financeNumber || '', l.name, l.companyName || '', l.mobile, l.email || '',
    l.gstNumber || '', l.businessType || '', l.projectType || '',
    l.projectLocation || '', l.loanAmountRequired || 0, l.status,
    new Date(l.createdAt).toISOString(),
  ].join(','));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="finance-leads.csv"');
  return res.send(header + rows.join('\n'));
});
