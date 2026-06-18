const VendorInvoice = require('../models/VendorInvoice');
const VendorOrder = require('../models/VendorOrder');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');
const { cloudinary } = require('../config/cloudinary');
const { generateRefNumber } = require('../services/refNumber.service');
const { vendorOrderMatch } = require('../utils/vendorOrderAccess');
const { logAction } = require('../services/auditLog.service');
const {
  isWorkflowVendorOrder,
  canTransition,
  appendAudit,
  pushEmbeddedHistory,
} = require('../services/vendorOrderWorkflow.service');
const { notifyAllAdmins } = require('../services/staffNotification.service');
const { syncMasterOrderStatusFromVendorOrders } = require('../services/masterOrderStatusSync.service');

function applyPickupContact(order, pickupContactName, pickupContactPhone) {
  if (order.deliveryType !== 'structbay_delivery') return null;
  const name = String(pickupContactName || '').trim();
  const phone = String(pickupContactPhone || '').trim();
  if (!name || !phone) {
    return 'Pickup contact name and phone are required for StructBay delivery (Type B).';
  }
  order.structbayLogistics = {
    ...(order.structbayLogistics && order.structbayLogistics.toObject
      ? order.structbayLogistics.toObject()
      : order.structbayLogistics || {}),
    pickupContactName: name,
    pickupContactPhone: phone,
  };
  return { name, phone };
}

function buildInvoicePayload({ orderId, vendorId, file, vendorRemarks, pickup }) {
  return {
    vendorOrder: orderId,
    vendor: vendorId,
    invoiceUrl: file.path,
    cloudinaryId: file.filename,
    vendorRemarks: vendorRemarks ? String(vendorRemarks).trim() : undefined,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: vendorId,
    submittedAt: new Date(),
    ...(pickup ? { pickupContactName: pickup.name, pickupContactPhone: pickup.phone } : {}),
  };
}

async function finalizeInvoiceUpload(order, invoice, req, structbayInvoiceNumber) {
  order.invoiceStatus = 'UPLOADED';

  if (isWorkflowVendorOrder(order)) {
    order.status = 'VENDOR_INVOICE_SUBMITTED';
    pushEmbeddedHistory(order, 'VENDOR_INVOICE_SUBMITTED', req.user._id, 'User', 'Vendor submitted final tax invoice.');
    await appendAudit(order._id, 'VENDOR_INVOICE_SUBMITTED', 'Vendor invoice PDF submitted', req.user._id, 'User');
    notifyAllAdmins({
      type: 'VENDOR_INVOICE_SUBMITTED',
      title: 'Vendor invoice received',
      message: `Vendor submitted invoice for sub-order ${order.orderNumber}.`,
      relatedVendorOrder: order._id,
    }).catch(() => {});
  } else {
    order.status = 'INVOICE_UPLOADED';
    order.statusHistory.push({
      status: 'INVOICE_UPLOADED',
      updatedBy: req.user._id,
      model: 'User',
      note: 'Vendor invoice uploaded',
      timestamp: new Date(),
    });
  }
  await order.save();

  await syncMasterOrderStatusFromVendorOrders(order.masterOrder, {
    changedBy: req.user._id,
    note: `Vendor invoice submitted for ${order.orderNumber}.`,
  });

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'invoice_upload',
    description: `Uploaded StructBay invoice ${structbayInvoiceNumber} for order ${order.orderNumber}`,
    relatedOrder: order._id,
    relatedInvoice: invoice._id,
    ipAddress: req.ip,
  });

  await logAction({
    adminId: req.user._id,
    action: 'UPLOAD',
    module: 'VendorInvoice',
    targetId: invoice._id.toString(),
    description: `Vendor invoice PDF uploaded for vendor order ${order.orderNumber} (${structbayInvoiceNumber}).`,
    ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200),
  });
}

// @desc    Upload Vendor Invoice
// @route   POST /api/v1/vendor/invoices
exports.uploadInvoice = async (req, res) => {
  const { orderId, vendorRemarks, pickupContactName, pickupContactPhone } = req.body;

  const match = await vendorOrderMatch(req.user);
  const order = await VendorOrder.findOne({ _id: orderId, ...match });
  if (!order) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');
  if (!req.file) return ApiResponse.badRequest(res, 'Please upload invoice PDF.');

  if (isWorkflowVendorOrder(order)) {
    if (order.status !== 'DISPATCH_APPROVED') {
      return ApiResponse.badRequest(
        res,
        'Final vendor invoice can only be uploaded after StructBay has approved dispatch (status DISPATCH_APPROVED).'
      );
    }
    if (!canTransition(order.status, 'VENDOR_INVOICE_SUBMITTED')) {
      return ApiResponse.badRequest(res, 'Invalid workflow state for invoice upload.');
    }
  }

  const pickupResult = applyPickupContact(order, pickupContactName, pickupContactPhone);
  if (typeof pickupResult === 'string') {
    return ApiResponse.badRequest(res, pickupResult);
  }

  const structbayInvoiceNumber = await generateRefNumber('VENDOR_INVOICE');
  const invoice = await VendorInvoice.create({
    ...buildInvoicePayload({
      orderId,
      vendorId: req.user._id,
      file: req.file,
      vendorRemarks,
      pickup: pickupResult,
    }),
    invoiceNumber: structbayInvoiceNumber,
  });

  await finalizeInvoiceUpload(order, invoice, req, structbayInvoiceNumber);

  return ApiResponse.created(res, 'Invoice uploaded successfully.', invoice);
};

// @desc    Replace Vendor Invoice
// @route   PUT /api/v1/vendor/invoices/:id/replace
exports.replaceInvoice = async (req, res) => {
  const { vendorRemarks, pickupContactName, pickupContactPhone } = req.body;

  const oldInvoice = await VendorInvoice.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!oldInvoice) return ApiResponse.notFound(res, 'Invoice not found.');
  if (!req.file) return ApiResponse.badRequest(res, 'Please upload new invoice PDF.');

  const match = await vendorOrderMatch(req.user);
  const order = await VendorOrder.findOne({ _id: oldInvoice.vendorOrder, ...match });
  if (!order) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');

  const pickupResult = applyPickupContact(order, pickupContactName, pickupContactPhone);
  if (typeof pickupResult === 'string') {
    return ApiResponse.badRequest(res, pickupResult);
  }

  if (oldInvoice.cloudinaryId) {
    await cloudinary.uploader.destroy(oldInvoice.cloudinaryId, { resource_type: 'raw' }).catch(() => {});
  }

  oldInvoice.status = 'replaced';
  await oldInvoice.save();

  const structbayInvoiceNumber = await generateRefNumber('VENDOR_INVOICE');
  const newInvoice = await VendorInvoice.create({
    ...buildInvoicePayload({
      orderId: oldInvoice.vendorOrder,
      vendorId: req.user._id,
      file: req.file,
      vendorRemarks,
      pickup: pickupResult,
    }),
    invoiceNumber: structbayInvoiceNumber,
    replacesInvoice: oldInvoice._id,
  });

  oldInvoice.replacedBy = newInvoice._id;
  await oldInvoice.save();

  if (pickupResult) await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'invoice_replace',
    description: `Replaced invoice ${oldInvoice.invoiceNumber} with ${structbayInvoiceNumber}`,
    relatedOrder: oldInvoice.vendorOrder,
    relatedInvoice: newInvoice._id,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Invoice replaced successfully.', newInvoice);
};

// @desc    Get Invoice by Order
// @route   GET /api/v1/vendor/invoices/order/:orderId
exports.getInvoiceByOrder = async (req, res) => {
  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.orderId, ...match });
  if (!vo) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');

  const invoice = await VendorInvoice.findOne({
    vendorOrder: vo._id,
    vendor: req.user._id,
    status: { $ne: 'replaced' },
  }).populate('vendorOrder', 'orderNumber');

  if (!invoice) return ApiResponse.notFound(res, 'No invoice found for this order.');
  return ApiResponse.success(res, 200, 'Invoice retrieved.', invoice);
};

// @desc    Get All Invoices
// @route   GET /api/v1/vendor/invoices
exports.getAllInvoices = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { vendor: req.user._id, status: { $ne: 'replaced' } };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [invoices, total] = await Promise.all([
    VendorInvoice.find(query)
      .populate('vendorOrder', 'orderNumber customer deliveryAddress')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    VendorInvoice.countDocuments(query),
  ]);

  return ApiResponse.success(res, 200, 'Invoices retrieved.', invoices, {
    page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)),
  });
};

// @desc    Download Invoice URL
// @route   GET /api/v1/vendor/invoices/:id/download
exports.downloadInvoice = async (req, res) => {
  const invoice = await VendorInvoice.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!invoice) return ApiResponse.notFound(res, 'Invoice not found.');
  return ApiResponse.success(res, 200, 'Invoice download URL.', { downloadUrl: invoice.invoiceUrl });
};
