const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const {
  generateShippingLabel,
  getShippingLabel,
  getShippingLabelPdfBuffer,
  shareShippingLabelWithVendor,
  revokeShippingLabelFromVendor,
} = require('../services/shippingLabel.service');

function resolveVendorOrderId(req) {
  const fromBody = req.body?.vendorOrderId;
  const fromQuery = req.query?.vendorOrderId;
  const id = fromBody || fromQuery;
  if (!id) throw new AppError('vendorOrderId is required (body or query).', 400);
  return String(id);
}

async function assertOrderAccess(orderId) {
  const order = await Order.findById(orderId).select('_id vendorOrders').lean();
  if (!order) throw new AppError('Order not found.', 404);
  return order;
}

const generateLabel = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const { label } = await generateShippingLabel({
    orderId: req.params.id,
    vendorOrderId,
    userId: req.user._id,
    regenerate: false,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Shipping label generated.', label);
});

const regenerateLabel = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const { label } = await generateShippingLabel({
    orderId: req.params.id,
    vendorOrderId,
    userId: req.user._id,
    regenerate: true,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Shipping label regenerated.', label);
});

const getLabel = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const label = await getShippingLabel(req.params.id, vendorOrderId);
  if (!label) return ApiResponse.notFound(res, 'Shipping label not found.');
  return ApiResponse.success(res, 200, 'Shipping label retrieved.', label);
});

const downloadLabel = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const label = await getShippingLabel(req.params.id, vendorOrderId);
  if (!label) throw new AppError('Shipping label not found. Generate a label first.', 404);

  const pdfBuffer = await getShippingLabelPdfBuffer(req.params.id, vendorOrderId);
  const fileName = `shipping-label-${label.shipmentId}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.send(pdfBuffer);
});

const previewLabel = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const label = await getShippingLabel(req.params.id, vendorOrderId);
  if (!label) throw new AppError('Shipping label not found. Generate a label first.', 404);

  const pdfBuffer = await getShippingLabelPdfBuffer(req.params.id, vendorOrderId);
  const fileName = `shipping-label-${label.shipmentId}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.send(pdfBuffer);
});

const shareLabelWithVendor = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const label = await shareShippingLabelWithVendor({
    orderId: req.params.id,
    vendorOrderId,
    userId: req.user._id,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Shipping label shared with vendor.', label);
});

const revokeLabelFromVendor = asyncHandler(async (req, res) => {
  const vendorOrderId = resolveVendorOrderId(req);
  await assertOrderAccess(req.params.id);

  const label = await revokeShippingLabelFromVendor({
    orderId: req.params.id,
    vendorOrderId,
    userId: req.user._id,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Vendor access to shipping label revoked.', label);
});

module.exports = {
  generateLabel,
  regenerateLabel,
  getLabel,
  downloadLabel,
  previewLabel,
  shareLabelWithVendor,
  revokeLabelFromVendor,
};
