const VendorInvoice = require('../models/VendorInvoice');
const VendorOrder = require('../models/VendorOrder');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');
const { cloudinary } = require('../config/cloudinary');
const { generateRefNumber } = require('../services/refNumber.service');
const { vendorOrderMatch } = require('../utils/vendorOrderAccess');
const { logAction } = require('../services/auditLog.service');

// @desc    Upload Vendor Invoice
// @route   POST /api/v1/vendor/invoices
exports.uploadInvoice = async (req, res) => {
  const { orderId, invoiceNumber, invoiceDate, invoiceAmount, gstAmount, vendorRemarks } = req.body;

  const match = await vendorOrderMatch(req.user);
  const order = await VendorOrder.findOne({ _id: orderId, ...match });
  if (!order) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');
  if (!req.file) return ApiResponse.badRequest(res, 'Please upload invoice PDF.');

  const totalAmount = parseFloat(invoiceAmount) + parseFloat(gstAmount);
  const structbayInvoiceNumber = await generateRefNumber('VENDOR_INVOICE');

  const invoice = await VendorInvoice.create({
    vendorOrder: orderId,
    vendor: req.user._id,
    invoiceNumber: structbayInvoiceNumber,
    vendorTaxInvoiceNumber: invoiceNumber || null,
    invoiceDate,
    invoiceAmount: parseFloat(invoiceAmount),
    gstAmount: parseFloat(gstAmount),
    totalAmount,
    invoiceUrl: req.file.path,
    cloudinaryId: req.file.filename,
    vendorRemarks,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    uploadedBy: req.user._id,
  });

  order.invoiceStatus = 'uploaded';
  order.status = 'vendor_invoice_sent';
  order.statusHistory.push({
    status: 'vendor_invoice_sent',
    updatedBy: req.user._id, updatedByModel: 'User',
    remarks: 'Vendor invoice uploaded', timestamp: new Date(),
  });
  await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'invoice_upload',
    description: `Uploaded StructBay invoice ${structbayInvoiceNumber}${invoiceNumber ? ` (vendor ref ${invoiceNumber})` : ''} for order ${order.orderNumber}`,
    relatedOrder: orderId, relatedInvoice: invoice._id, ipAddress: req.ip,
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

  return ApiResponse.created(res, 'Invoice uploaded successfully.', invoice);
};

// @desc    Replace Vendor Invoice
// @route   PUT /api/v1/vendor/invoices/:id/replace
exports.replaceInvoice = async (req, res) => {
  const { invoiceNumber, invoiceDate, invoiceAmount, gstAmount, vendorRemarks } = req.body;

  const oldInvoice = await VendorInvoice.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!oldInvoice) return ApiResponse.notFound(res, 'Invoice not found.');
  if (!req.file) return ApiResponse.badRequest(res, 'Please upload new invoice PDF.');

  if (oldInvoice.cloudinaryId) {
    await cloudinary.uploader.destroy(oldInvoice.cloudinaryId, { resource_type: 'raw' }).catch(() => {});
  }

  oldInvoice.status = 'replaced';
  await oldInvoice.save();

  const totalAmount = parseFloat(invoiceAmount) + parseFloat(gstAmount);
  const structbayInvoiceNumber = await generateRefNumber('VENDOR_INVOICE');
  const newInvoice = await VendorInvoice.create({
    vendorOrder: oldInvoice.vendorOrder,
    vendor: req.user._id,
    invoiceNumber: structbayInvoiceNumber,
    vendorTaxInvoiceNumber: invoiceNumber || null,
    invoiceDate,
    invoiceAmount: parseFloat(invoiceAmount),
    gstAmount: parseFloat(gstAmount),
    totalAmount,
    invoiceUrl: req.file.path,
    cloudinaryId: req.file.filename,
    vendorRemarks,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    replacesInvoice: oldInvoice._id,
    uploadedBy: req.user._id,
  });

  oldInvoice.replacedBy = newInvoice._id;
  await oldInvoice.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'invoice_replace',
    description: `Replaced invoice ${oldInvoice.invoiceNumber} with ${structbayInvoiceNumber}${invoiceNumber ? ` (vendor ref ${invoiceNumber})` : ''}`,
    relatedOrder: oldInvoice.vendorOrder, relatedInvoice: newInvoice._id, ipAddress: req.ip,
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
