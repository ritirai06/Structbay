const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const VendorOrder = require('../models/VendorOrder');
const {
  canTransition,
  appendAudit,
  pushEmbeddedHistory,
  isWorkflowVendorOrder,
  notifyCustomerMaster,
} = require('../services/vendorOrderWorkflow.service');
const { notifyVendor } = require('../services/vendorNotification.service');
const { notifyAllAdmins } = require('../services/staffNotification.service');
const { logAction } = require('../services/auditLog.service');

exports.approveDispatch = asyncHandler(async (req, res) => {
  const vo = await VendorOrder.findById(req.params.id).populate('vendor', '_id');
  if (!vo) throw new AppError('Vendor order not found.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not active for this vendor order.', 400);
  if (vo.status !== 'READY_FOR_DISPATCH') {
    throw new AppError('Only orders in READY_FOR_DISPATCH can be approved.', 400);
  }
  if (!canTransition(vo.status, 'DISPATCH_APPROVED')) throw new AppError('Invalid transition.', 400);

  vo.status = 'DISPATCH_APPROVED';
  vo.adminChangeRequestNote = undefined;
  pushEmbeddedHistory(vo, 'DISPATCH_APPROVED', req.user._id, 'User', 'Admin approved dispatch.');
  await vo.save();
  await appendAudit(vo._id, 'DISPATCH_APPROVED', 'Admin approved dispatch', req.user._id, 'User');

  notifyVendor({
    vendorId: vo.vendor._id || vo.vendor,
    type: 'wf_dispatch_approved',
    title: 'Dispatch approved',
    message: `StructBay approved dispatch for ${vo.orderNumber}. You may now submit your final tax invoice.`,
    relatedOrder: vo._id,
    actionUrl: `/orders/${vo._id}`,
    actionLabel: 'Upload invoice',
    createdBy: req.user._id,
  }).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Dispatch approved ${vo.orderNumber}`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Dispatch approved.', vo);
});

exports.requestDispatchChanges = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note || !String(note).trim()) throw new AppError('note is required.', 400);

  const vo = await VendorOrder.findById(req.params.id).populate('vendor', '_id');
  if (!vo) throw new AppError('Vendor order not found.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not active for this vendor order.', 400);
  if (vo.status !== 'READY_FOR_DISPATCH') {
    throw new AppError('Changes can only be requested while the order is READY_FOR_DISPATCH.', 400);
  }
  if (!canTransition(vo.status, 'CHANGES_REQUESTED')) throw new AppError('Invalid transition.', 400);

  vo.status = 'CHANGES_REQUESTED';
  vo.adminChangeRequestNote = note.trim();
  pushEmbeddedHistory(vo, 'CHANGES_REQUESTED', req.user._id, 'User', note.trim());
  await vo.save();
  await appendAudit(vo._id, 'CHANGES_REQUESTED', note.trim(), req.user._id, 'User');

  notifyVendor({
    vendorId: vo.vendor._id || vo.vendor,
    type: 'wf_changes_requested',
    title: 'Changes requested',
    message: `StructBay requested changes before dispatch approval for ${vo.orderNumber}: ${note.trim()}`,
    relatedOrder: vo._id,
    actionUrl: `/orders/${vo._id}`,
    actionLabel: 'Update & resubmit',
    createdBy: req.user._id,
  }).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Dispatch changes requested ${vo.orderNumber}`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Vendor notified of requested changes.', vo);
});

exports.sendStructbayDocs = asyncHandler(async (req, res) => {
  const { invoice_number: invoiceNumber, eway_bill_number: ewayBillNumber } = req.body;
  const vo = await VendorOrder.findById(req.params.id).populate('vendor', '_id');
  if (!vo) throw new AppError('Vendor order not found.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not active for this vendor order.', 400);
  if (vo.status !== 'VENDOR_INVOICE_SUBMITTED') {
    throw new AppError('StructBay documents can only be sent after the vendor final invoice is submitted.', 400);
  }
  if (!canTransition(vo.status, 'SB_INVOICE_SENT')) throw new AppError('Invalid transition.', 400);

  const grouped = req.files || {};
  const inv = (grouped.sbInvoice && grouped.sbInvoice[0]) || null;
  const eway = (grouped.ewayBill && grouped.ewayBill[0]) || null;
  if (!inv || !eway) throw new AppError('StructBay invoice PDF and e-way bill PDF are required.', 400);
  if (!invoiceNumber || !ewayBillNumber) throw new AppError('invoice_number and eway_bill_number are required.', 400);

  vo.structbayOutboundDocs = {
    invoicePdfUrl: inv.path,
    invoicePdfCloudinaryId: inv.filename,
    invoiceNumber: String(invoiceNumber).trim(),
    ewayBillPdfUrl: eway.path,
    ewayBillPdfCloudinaryId: eway.filename,
    ewayBillNumber: String(ewayBillNumber).trim(),
    sentAt: new Date(),
    sentBy: req.user._id,
  };
  vo.status = 'SB_INVOICE_SENT';
  pushEmbeddedHistory(vo, 'SB_INVOICE_SENT', req.user._id, 'User', 'StructBay invoice and e-way bill sent to vendor.');
  await vo.save();
  await appendAudit(vo._id, 'SB_INVOICE_SENT', 'SB invoice + e-way sent', req.user._id, 'User');

  notifyVendor({
    vendorId: vo.vendor._id || vo.vendor,
    type: 'wf_sb_invoice_sent',
    title: 'StructBay invoice & e-way bill',
    message: `StructBay documents for ${vo.orderNumber} are available. You may dispatch the shipment.`,
    relatedOrder: vo._id,
    actionUrl: `/orders/${vo._id}`,
    actionLabel: 'View order',
    createdBy: req.user._id,
  }).catch(() => {});

  notifyAllAdmins({
    type: 'SB_INVOICE_SENT',
    title: 'SB documents sent',
    message: `StructBay documents sent to vendor for ${vo.orderNumber}.`,
    relatedVendorOrder: vo._id,
  }).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `SB invoice/e-way sent ${vo.orderNumber}`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'StructBay documents sent.', vo);
});

exports.confirmDelivery = asyncHandler(async (req, res) => {
  const vo = await VendorOrder.findById(req.params.id).populate('vendor', '_id');
  if (!vo) throw new AppError('Vendor order not found.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not active for this vendor order.', 400);
  if (vo.status !== 'DELIVERED') {
    throw new AppError('Delivery can only be confirmed after the vendor has marked the order delivered with POD.', 400);
  }
  if (!vo.deliveryProof?.podUrl) {
    throw new AppError('Proof of delivery is missing; cannot complete this order.', 400);
  }
  if (!canTransition(vo.status, 'COMPLETED')) throw new AppError('Invalid transition.', 400);

  vo.status = 'COMPLETED';
  const prev = vo.deliveryProof && vo.deliveryProof.toObject ? vo.deliveryProof.toObject() : vo.deliveryProof || {};
  vo.deliveryProof = {
    ...prev,
    confirmedByAdmin: req.user._id,
    confirmedAt: new Date(),
  };
  pushEmbeddedHistory(vo, 'COMPLETED', req.user._id, 'User', 'Admin confirmed delivery (POD verified).');
  await vo.save();
  await appendAudit(vo._id, 'COMPLETED', 'Admin confirmed delivery', req.user._id, 'User');

  notifyVendor({
    vendorId: vo.vendor._id || vo.vendor,
    type: 'wf_delivery_confirmed',
    title: 'Delivery confirmed',
    message: `StructBay confirmed delivery for ${vo.orderNumber}.`,
    relatedOrder: vo._id,
    actionUrl: `/orders/${vo._id}`,
    actionLabel: 'View order',
    createdBy: req.user._id,
  }).catch(() => {});

  await notifyCustomerMaster(vo.masterOrder, {
    title: 'Order completed',
    message: `Your order is completed (sub-order ${vo.orderNumber}).`,
    type: 'ORDER',
  });

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Delivery confirmed ${vo.orderNumber}`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Delivery confirmed.', vo);
});
