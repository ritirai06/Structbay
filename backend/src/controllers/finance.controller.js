const asyncHandler      = require('../utils/asyncHandler');
const ApiResponse       = require('../utils/apiResponse');
const FinanceLead       = require('../models/FinanceLead');
const FinanceDocument   = require('../models/FinanceDocument');
const { uploadDocument } = require('../middleware/upload.middleware');
const { UPLOAD_FOLDERS } = require('../config/constants');
const communicationSvc  = require('../services/communication.service');
const { auditAction }   = require('../services/auditLog.service');
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

  const lead = await FinanceLead.create({
    name, companyName, mobile, email, gstNumber,
    businessType, projectType, projectLocation,
    loanAmountRequired, purposeOfLoan, monthlyTurnover, remarks,
    customer: req.user?._id || null,
    status: 'NEW',
    statusHistory: [{ status: 'NEW', note: 'Application submitted.', changedAt: new Date() }],
  });

  // Notify applicant
  if (email || mobile) {
    communicationSvc.notifyFinanceApp({
      to: { email, phone: mobile },
      vars: { customerName: name, applicationId: lead._id.toString() },
      recipientRef: lead._id,
    }).catch(() => {});
  }

  return ApiResponse.created(res, 'Finance application submitted successfully.', { id: lead._id });
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
  if (search)     filter.$or = [
    { name:        { $regex: search, $options: 'i' } },
    { companyName: { $regex: search, $options: 'i' } },
    { mobile:      { $regex: search, $options: 'i' } },
  ];

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

  const update = {
    status,
    $push: { statusHistory: { status, changedBy: req.user._id, note, changedAt: new Date() } },
  };
  if (status === 'DISBURSED') {
    update.disbursedAmount = disbursedAmount;
    update.disbursedAt     = new Date();
  }

  const updated = await FinanceLead.findByIdAndUpdate(req.params.id, update, { new: true });
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

  const header = 'ID,Name,Company,Mobile,Email,GST,Business,Project,Location,LoanAmount,Status,CreatedAt\n';
  const rows   = leads.map((l) => [
    l._id, l.name, l.companyName || '', l.mobile, l.email || '',
    l.gstNumber || '', l.businessType || '', l.projectType || '',
    l.projectLocation || '', l.loanAmountRequired || 0, l.status,
    new Date(l.createdAt).toISOString(),
  ].join(','));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="finance-leads.csv"');
  return res.send(header + rows.join('\n'));
});
