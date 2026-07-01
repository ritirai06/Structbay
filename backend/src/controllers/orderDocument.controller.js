const asyncHandler    = require('../utils/asyncHandler');
const ApiResponse     = require('../utils/apiResponse');
const AppError        = require('../utils/AppError');
const OrderDocument   = require('../models/OrderDocument');
const Order           = require('../models/Order');
const VendorOrder     = require('../models/VendorOrder');
const VendorInvoice   = require('../models/VendorInvoice');
const { logAction }   = require('../services/auditLog.service');
const { logOrderActivity, notifyCustomer } = require('../services/order.service');
const { generateRefNumber } = require('../services/refNumber.service');

async function allocateDocumentReference(documentType) {
  if (documentType === 'Structbay_INVOICE' || documentType === 'TAX_INVOICE') {
    return generateRefNumber('CUSTOMER_INVOICE');
  }
  if (documentType === 'EWAY_BILL') return generateRefNumber('EWAY_BILL');
  if (documentType === 'DELIVERY_CHALLAN') return generateRefNumber('DELIVERY');
  if (documentType === 'VENDOR_INVOICE') return generateRefNumber('VENDOR_INVOICE');
  return null;
}

// ─── POST /order-documents ─────────────────────────────────────────────────────
exports.upload = asyncHandler(async (req, res) => {
  const {
    masterOrderId, vendorOrderId,
    documentType, label, url, cloudinaryId,
    mimeType, fileSize, visibleToCustomer, visibleToVendor,
  } = req.body;

  if (!masterOrderId || !documentType || !url) {
    throw new AppError('masterOrderId, documentType, url are required.', 400);
  }

  const documentReference = await allocateDocumentReference(documentType);

  const doc = await OrderDocument.create({
    masterOrder: masterOrderId,
    vendorOrder:  vendorOrderId || null,
    documentType, label, url, cloudinaryId,
    mimeType, fileSize,
    documentReference,
    visibleToCustomer: visibleToCustomer || false,
    visibleToVendor:   visibleToVendor   || false,
    uploadedBy:      req.user._id,
    uploadedByModel: 'User',
  });

  const orderRefUpdates = {};
  // Sync invoice URL on master order
  if (documentType === 'Structbay_INVOICE' || documentType === 'TAX_INVOICE') {
    orderRefUpdates.structbayInvoiceUrl = url;
    orderRefUpdates.invoiceUrl = url;
    if (documentReference) orderRefUpdates.customerInvoiceNumber = documentReference;
  }
  if (documentType === 'EWAY_BILL') {
    orderRefUpdates.ewayBillUrl = url;
    if (documentReference) orderRefUpdates.ewayBillNumber = documentReference;
  }
  if (documentType === 'DELIVERY_CHALLAN' && documentReference) {
    orderRefUpdates.deliveryChallanNumber = documentReference;
  }
  if (Object.keys(orderRefUpdates).length) {
    await Order.findByIdAndUpdate(masterOrderId, orderRefUpdates);
  }

  // Sync vendor order invoice status
  if (documentType === 'VENDOR_INVOICE' && vendorOrderId) {
    await VendorOrder.findByIdAndUpdate(vendorOrderId, { invoiceStatus: 'UPLOADED' });
    const vo = await VendorOrder.findById(vendorOrderId);
    if (vo && documentReference) {
      await VendorInvoice.create({
        vendorOrder:   vendorOrderId,
        vendor:        vo.vendor,
        invoiceNumber: documentReference,
        vendorTaxInvoiceNumber: req.body.invoiceNumber || null,
        invoiceDate:   req.body.invoiceDate   || new Date(),
        invoiceAmount: req.body.invoiceAmount || 0,
        gstAmount:     req.body.gstAmount     || 0,
        totalAmount:   req.body.totalAmount   || 0,
        invoiceUrl:    url,
        cloudinaryId,
        adminRemarks:  label,
        uploadedBy:    req.user._id,
        mimeType, fileSize,
      }).catch(() => {});
    }
  }

  const masterOrder = await Order.findById(masterOrderId).select('customer orderNumber');

  if (documentType === 'Structbay_INVOICE' || documentType === 'TAX_INVOICE') {
    const invMsg = documentReference
      ? `Invoice ${documentReference} is now available for your order ${masterOrder?.orderNumber}.`
      : `An invoice is now available for your order ${masterOrder?.orderNumber}.`;
    await notifyCustomer({ customerId: masterOrder?.customer,
      title: 'Invoice Available', type: 'INVOICE', refId: masterOrder?.orderNumber,
      message: `${invMsg} Download from My Orders.` });
  }

  await logOrderActivity({ masterOrder: masterOrderId, vendorOrder: vendorOrderId,
    actorType: 'ADMIN', actor: req.user._id, action: 'DOCUMENT_UPLOADED',
    description: `${documentType} uploaded${documentReference ? ` (${documentReference})` : ''}.` });
  await logAction({ adminId: req.user._id, action: 'CREATE', module: 'OrderDocument',
    targetId: doc._id.toString(), description: `${documentType} uploaded for order.`, ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200) });

  return ApiResponse.created(res, 'Document uploaded.', doc);
});

// ─── GET /order-documents?masterOrderId=xxx ────────────────────────────────────
exports.getByOrder = asyncHandler(async (req, res) => {
  const { masterOrderId, vendorOrderId, documentType } = req.query;
  if (!masterOrderId) throw new AppError('masterOrderId required.', 400);

  const filter = { masterOrder: masterOrderId };
  if (vendorOrderId) filter.vendorOrder = vendorOrderId;
  if (documentType)  filter.documentType = documentType;

  const docs = await OrderDocument.find(filter).sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Documents retrieved.', docs);
});

// ─── PATCH /order-documents/:id/verify ────────────────────────────────────────
exports.verify = asyncHandler(async (req, res) => {
  const doc = await OrderDocument.findByIdAndUpdate(
    req.params.id,
    { status: 'VERIFIED', isVerified: true, verifiedBy: req.user._id, verifiedAt: new Date() },
    { new: true }
  );
  if (!doc) throw new AppError('Document not found.', 404);

  if (doc.documentType === 'VENDOR_INVOICE' && doc.vendorOrder) {
    await VendorOrder.findByIdAndUpdate(doc.vendorOrder, { invoiceStatus: 'VERIFIED' });
    const invQuery = doc.documentReference
      ? { vendorOrder: doc.vendorOrder, invoiceNumber: doc.documentReference }
      : { vendorOrder: doc.vendorOrder, invoiceUrl: doc.url };
    await VendorInvoice.findOneAndUpdate(invQuery,
      { status: 'verified', verifiedBy: req.user._id, verifiedAt: new Date() });
  }

  await logOrderActivity({ masterOrder: doc.masterOrder, vendorOrder: doc.vendorOrder,
    actorType: 'ADMIN', actor: req.user._id, action: 'INVOICE_VERIFIED',
    description: `${doc.documentType} verified.` });

  return ApiResponse.success(res, 200, 'Document verified.', doc);
});

// ─── PATCH /order-documents/:id/reject ────────────────────────────────────────
exports.reject = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const doc = await OrderDocument.findByIdAndUpdate(
    req.params.id,
    { status: 'REJECTED', isVerified: false, rejectionReason: reason, verifiedBy: req.user._id, verifiedAt: new Date() },
    { new: true }
  );
  if (!doc) throw new AppError('Document not found.', 404);

  if (doc.documentType === 'VENDOR_INVOICE' && doc.vendorOrder) {
    await VendorOrder.findByIdAndUpdate(doc.vendorOrder, { invoiceStatus: 'REJECTED' });
    const invQuery = doc.documentReference
      ? { vendorOrder: doc.vendorOrder, invoiceNumber: doc.documentReference }
      : { vendorOrder: doc.vendorOrder, invoiceUrl: doc.url };
    await VendorInvoice.findOneAndUpdate(invQuery,
      { status: 'rejected', rejectionReason: reason });
  }

  await logOrderActivity({ masterOrder: doc.masterOrder, vendorOrder: doc.vendorOrder,
    actorType: 'ADMIN', actor: req.user._id, action: 'INVOICE_REJECTED',
    description: `${doc.documentType} rejected. Reason: ${reason}` });

  return ApiResponse.success(res, 200, 'Document rejected.', doc);
});
