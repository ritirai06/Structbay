const AppError = require('../utils/AppError');
const Order = require('../models/Order');
const VendorOrder = require('../models/VendorOrder');
const ShippingLabel = require('../models/ShippingLabel');
const User = require('../models/User');
const { generateRefNumber } = require('./refNumber.service');
const { buildShippingLabelPdf } = require('./shippingLabelPdf.service');
const { uploadBuffer, deleteFile } = require('../config/cloudinary');
const { UPLOAD_FOLDERS } = require('../config/constants');
const { logAction } = require('./auditLog.service');

const storefrontOrigin = () =>
  (process.env.CUSTOMER_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const warehouseFromEnv = () => ({
  name: process.env.STRUCTBAY_WAREHOUSE_NAME || 'StructBay Warehouse',
  address: process.env.STRUCTBAY_WAREHOUSE_ADDRESS || 'StructBay Fulfillment Center, India',
  phone: process.env.STRUCTBAY_WAREHOUSE_PHONE || process.env.SUPPORT_PHONE || '',
  gst: process.env.STRUCTBAY_GST_NUMBER || '',
});

async function loadOrderContext(orderId, vendorOrderId) {
  const order = await Order.findById(orderId)
    .populate('customer', 'name email phone')
    .populate('city', 'name state')
    .lean();
  if (!order) throw new AppError('Order not found.', 404);

  const vo = await VendorOrder.findOne({ _id: vendorOrderId, masterOrder: orderId })
    .populate('vendor', 'name companyName phone gstNumber billingAddress')
    .lean();
  if (!vo) throw new AppError('Vendor order not found for this master order.', 404);

  return { order, vo };
}

function resolveShipTo(order, vo) {
  const addr = vo.deliveryAddress || order.shippingAddress || {};
  const customer = order.customer || {};
  return {
    name: addr.contactPerson || addr.name || vo.customerInfo?.name || customer.name || 'Customer',
    phone: addr.contactPhone || addr.phone || vo.customerInfo?.phone || customer.phone || '',
    address: [addr.line1, addr.line2].filter(Boolean).join(', ') || '—',
    city: addr.city || order.city?.name || '',
    state: addr.state || order.city?.state || '',
    pincode: addr.pincode || '',
  };
}

function resolveShipFrom(vo) {
  if (vo.deliveryType === 'structbay_delivery') {
    const wh = warehouseFromEnv();
    return {
      name: wh.name,
      phone: wh.phone,
      address: wh.address,
      gst: wh.gst,
    };
  }
  const vendor = vo.vendor || {};
  const billing = vendor.billingAddress || '';
  return {
    name: vendor.companyName || vendor.name || 'Vendor',
    phone: vendor.phone || vo.structbayLogistics?.pickupContactPhone || '',
    address: typeof billing === 'string' && billing.trim() ? billing : '—',
    gst: vendor.gstNumber || '',
  };
}

function buildProducts(vo) {
  const { formatVariationLabel } = require('../utils/variationAttributes');
  return (vo.items || []).map((item) => {
    const variationLabel = item.variationLabel
      || (item.variation?.attributes ? formatVariationLabel(item.variation.attributes) : '');
    return {
      name: item.productName || 'Product',
      sku: item.sku || '',
      variationLabel,
      quantity: item.quantity || 1,
      weight: null,
    };
  });
}

function buildLogistics(vo) {
  const lg = vo.structbayLogistics || {};
  const sd = vo.shipmentDispatch || {};
  const pickupPhone =
    lg.pickupContactPhone ||
    vo.vendor?.phone ||
    null;
  return {
    partner: lg.companyName || sd.transporterName || null,
    pickupWindow: lg.pickupScheduledText || null,
    estimatedDelivery: vo.expectedDeliveryDate
      ? new Date(vo.expectedDeliveryDate).toLocaleDateString('en-IN')
      : null,
    driver: lg.driverContactDetails || null,
    driverContact: pickupPhone || sd.trackingNumber || null,
  };
}

/**
 * Scan payloads must match what is printed on the label.
 * - Code128 barcode: tracking number (logistics primary key on label)
 * - QR: full JSON snapshot of all visible label fields
 */
function buildLabelScanPayload(labelData) {
  const trackingNumber = String(labelData.trackingNumber || '').trim();
  const shipmentId = String(labelData.shipmentId || '').trim();
  const orderNumber = String(labelData.orderNumber || '').trim();

  if (!trackingNumber || !shipmentId || !orderNumber) {
    throw new Error('Label scan payload requires orderNumber, shipmentId, and trackingNumber.');
  }

  const barcodeValue = trackingNumber;

  const qrPayload = {
    type: 'structbay_shipping_label',
    version: 1,
    orderNumber,
    shipmentId,
    trackingNumber,
    deliveryType: labelData.deliveryType || null,
    shipTo: labelData.shipTo || null,
    shipFrom: labelData.shipFrom || null,
    products: labelData.products || [],
    packageCount: labelData.packageCount ?? 1,
    totalWeight: labelData.totalWeight ?? null,
    logistics: labelData.logistics || null,
    trackUrl: `${storefrontOrigin()}/track-order?orderNumber=${encodeURIComponent(orderNumber)}`,
  };

  return {
    barcodeValue,
    qrValue: JSON.stringify(qrPayload),
  };
}

function assembleLabelData(order, vo, shipmentId, trackingNumber) {
  return {
    orderNumber: order.orderNumber,
    shipmentId,
    trackingNumber,
    shipTo: resolveShipTo(order, vo),
    shipFrom: resolveShipFrom(vo),
    products: buildProducts(vo),
    packageCount: 1,
    totalWeight: null,
    logistics: buildLogistics(vo),
    deliveryType: vo.deliveryType,
  };
}

function formatLabelResponse(label, generatedByUser, sharedByUser) {
  const obj = label.toObject ? label.toObject() : label;
  const generated = obj.status !== 'VOID' && Boolean(obj.labelUrl);
  return {
    id: obj._id,
    orderId: obj.order,
    vendorOrderId: obj.vendorOrder,
    shipmentId: obj.shipmentId,
    trackingNumber: obj.trackingNumber,
    generatedBy: generatedByUser
      ? { id: generatedByUser._id, name: generatedByUser.name }
      : obj.generatedBy,
    generatedAt: obj.generatedAt,
    labelUrl: obj.labelUrl,
    barcodeValue: obj.barcodeValue,
    qrValue: obj.qrValue,
    status: obj.status,
    deliveryType: obj.deliveryType,
    version: obj.version,
    labelGenerated: generated,
    shipping_label_generated: generated,
    shipping_label_shared_with_vendor: Boolean(obj.sharedWithVendor),
    sharedWithVendor: Boolean(obj.sharedWithVendor),
    shipping_label_shared_at: obj.sharedAt || null,
    sharedAt: obj.sharedAt || null,
    sharedBy: sharedByUser
      ? { id: sharedByUser._id, name: sharedByUser.name }
      : obj.sharedBy,
  };
}

async function generateShippingLabel({
  orderId,
  vendorOrderId,
  userId,
  regenerate = false,
  ipAddress,
}) {
  const { order, vo } = await loadOrderContext(orderId, vendorOrderId);

  const existing = await ShippingLabel.findOne({ order: orderId, vendorOrder: vendorOrderId });
  if (existing && !regenerate) {
    const user = await User.findById(existing.generatedBy).select('name').lean();
    return { label: formatLabelResponse(existing, user), created: false };
  }

  const shipmentId = existing?.shipmentId || await generateRefNumber('SHIPMENT');
  let trackingNumber =
    vo.shipmentDispatch?.trackingNumber ||
    existing?.trackingNumber ||
    null;
  if (!trackingNumber) {
    trackingNumber = await generateRefNumber('TRACKING');
  }

  const labelData = assembleLabelData(order, vo, shipmentId, trackingNumber);
  const scan = buildLabelScanPayload(labelData);
  labelData.barcodeValue = scan.barcodeValue;
  labelData.qrValue = scan.qrValue;
  const { barcodeValue, qrValue } = scan;

  const pdfBuffer = await buildShippingLabelPdf(labelData);
  const fileName = `label-${shipmentId}.pdf`;

  if (existing?.labelCloudinaryId) {
    await deleteFile(existing.labelCloudinaryId, 'raw').catch(() => {});
  }

  const uploaded = await uploadBuffer(
    pdfBuffer,
    UPLOAD_FOLDERS.SHIPPING_LABEL,
    'raw',
    fileName
  );

  const generatedByUser = await User.findById(userId).select('name email').lean();
  let label;

  if (existing) {
    existing.shipmentId = shipmentId;
    existing.trackingNumber = trackingNumber;
    existing.generatedBy = userId;
    existing.generatedAt = new Date();
    existing.labelUrl = uploaded.url;
    existing.labelCloudinaryId = uploaded.publicId;
    existing.barcodeValue = barcodeValue;
    existing.qrValue = qrValue;
    existing.status = 'REGENERATED';
    existing.deliveryType = vo.deliveryType;
    existing.labelSnapshot = labelData;
    existing.version = (existing.version || 1) + 1;
    existing.sharedWithVendor = false;
    existing.sharedAt = null;
    existing.sharedBy = null;
    await existing.save();
    label = existing;
  } else {
    label = await ShippingLabel.create({
      order: orderId,
      vendorOrder: vendorOrderId,
      shipmentId,
      trackingNumber,
      generatedBy: userId,
      generatedAt: new Date(),
      labelUrl: uploaded.url,
      labelCloudinaryId: uploaded.publicId,
      barcodeValue,
      qrValue,
      status: 'GENERATED',
      deliveryType: vo.deliveryType,
      labelSnapshot: labelData,
      version: 1,
    });
  }

  // Persist tracking on vendor order for downstream logistics
  await VendorOrder.updateOne(
    { _id: vendorOrderId },
    {
      $set: {
        'shipmentDispatch.trackingNumber': trackingNumber,
      },
    }
  );

  await logAction({
    adminId: userId,
    action: regenerate ? 'UPDATE' : 'CREATE',
    module: 'ShippingLabel',
    targetId: label._id.toString(),
    description: `${regenerate ? 'Regenerated' : 'Generated'} shipping label ${shipmentId} for order ${order.orderNumber}`,
    ipAddress,
  });

  return { label: formatLabelResponse(label, generatedByUser), created: !existing || regenerate, pdfBuffer };
}

async function getShippingLabel(orderId, vendorOrderId) {
  const label = await ShippingLabel.findOne({ order: orderId, vendorOrder: vendorOrderId })
    .populate('generatedBy', 'name email')
    .populate('sharedBy', 'name email');
  if (!label) return null;
  return formatLabelResponse(label, label.generatedBy, label.sharedBy);
}

async function shareShippingLabelWithVendor({ orderId, vendorOrderId, userId, ipAddress }) {
  const { vo } = await loadOrderContext(orderId, vendorOrderId);
  if (vo.deliveryType === 'structbay_delivery') {
    throw new AppError(
      'Shipping labels are not shared with vendors for StructBay delivery (Type B). StructBay handles customer delivery internally.',
      400
    );
  }

  const label = await ShippingLabel.findOne({ order: orderId, vendorOrder: vendorOrderId, status: { $ne: 'VOID' } });
  if (!label || !label.labelUrl) {
    throw new AppError('Generate a shipping label before sharing with the vendor.', 404);
  }
  if (label.sharedWithVendor) {
    const sharedByUser = await User.findById(label.sharedBy).select('name').lean();
    return formatLabelResponse(label, null, sharedByUser);
  }

  label.sharedWithVendor = true;
  label.sharedAt = new Date();
  label.sharedBy = userId;
  await label.save();

  const sharedByUser = await User.findById(userId).select('name email').lean();
  await logAction({
    adminId: userId,
    action: 'UPDATE',
    module: 'ShippingLabel',
    targetId: label._id.toString(),
    description: `Shared shipping label ${label.shipmentId} with vendor for sub-order`,
    ipAddress,
  });

  return formatLabelResponse(label, null, sharedByUser);
}

async function revokeShippingLabelFromVendor({ orderId, vendorOrderId, userId, ipAddress }) {
  const label = await ShippingLabel.findOne({ order: orderId, vendorOrder: vendorOrderId, status: { $ne: 'VOID' } });
  if (!label) throw new AppError('Shipping label not found.', 404);
  if (!label.sharedWithVendor) {
    throw new AppError('Shipping label is not currently shared with the vendor.', 400);
  }

  label.sharedWithVendor = false;
  label.sharedAt = null;
  label.sharedBy = null;
  await label.save();

  await logAction({
    adminId: userId,
    action: 'UPDATE',
    module: 'ShippingLabel',
    targetId: label._id.toString(),
    description: `Revoked vendor access to shipping label ${label.shipmentId}`,
    ipAddress,
  });

  return formatLabelResponse(label, null, null);
}

async function getShippingLabelPdfBuffer(orderId, vendorOrderId) {
  const label = await ShippingLabel.findOne({ order: orderId, vendorOrder: vendorOrderId });
  if (!label) throw new AppError('Shipping label not found. Generate a label first.', 404);

  let labelData;
  if (label.labelSnapshot) {
    labelData = {
      ...label.labelSnapshot,
      orderNumber: label.labelSnapshot.orderNumber || label.orderNumber,
      shipmentId: label.shipmentId,
      trackingNumber: label.trackingNumber,
    };
  } else {
    const { order, vo } = await loadOrderContext(orderId, vendorOrderId);
    labelData = assembleLabelData(order, vo, label.shipmentId, label.trackingNumber);
  }

  const scan = buildLabelScanPayload(labelData);
  labelData.barcodeValue = scan.barcodeValue;
  labelData.qrValue = scan.qrValue;

  return buildShippingLabelPdf(labelData);
}

module.exports = {
  generateShippingLabel,
  getShippingLabel,
  getShippingLabelPdfBuffer,
  shareShippingLabelWithVendor,
  revokeShippingLabelFromVendor,
  loadOrderContext,
  buildLabelScanPayload,
  assembleLabelData,
};
