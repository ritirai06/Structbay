const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const VendorOrder = require('../models/VendorOrder');
const VendorDispatch = require('../models/VendorDispatch');
const Order = require('../models/Order');
const { vendorOrderMatch } = require('../utils/vendorOrderAccess');
const { decorateVendorOrderForPortal } = require('../utils/vendorOrderPortal');
const {
  canTransition,
  appendAudit,
  pushEmbeddedHistory,
  isWorkflowVendorOrder,
  notifyCustomerMaster,
} = require('../services/vendorOrderWorkflow.service');
const { notifyAllAdmins } = require('../services/staffNotification.service');
const { notifyVendor } = require('../services/vendorNotification.service');
const { logAction } = require('../services/auditLog.service');
const { syncMasterOrderStatusFromVendorOrders } = require('../services/masterOrderStatusSync.service');

function wfNotifyVendor(vo, type, title, message) {
  return notifyVendor({
    vendorId: vo.vendor,
    type,
    title,
    message,
    relatedOrder: vo._id,
    actionUrl: `/orders/${vo._id}`,
    actionLabel: 'View order',
    priority: 'normal',
  }).catch(() => {});
}

exports.acceptOrder = asyncHandler(async (req, res) => {
  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.id, ...match });
  if (!vo) throw new AppError('Order not found or not assigned to you.', 404);
  if (!['NEW_ASSIGNED', 'ASSIGNED'].includes(vo.status)) {
    throw new AppError('This order cannot be accepted in its current status.', 400);
  }
  if (!canTransition(vo.status, 'ACCEPTED')) throw new AppError('Invalid status transition.', 400);

  vo.status = 'ACCEPTED';
  pushEmbeddedHistory(vo, 'ACCEPTED', req.user._id, 'User', 'Vendor accepted the order.');
  await vo.save();
  await appendAudit(vo._id, 'ACCEPTED', 'Vendor accepted', req.user._id, 'User');

  notifyAllAdmins({
    type: 'ORDER_ACCEPTED',
    title: 'Vendor accepted order',
    message: `Sub-order ${vo.orderNumber} was accepted.`,
    relatedVendorOrder: vo._id,
  }).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Vendor accepted ${vo.orderNumber}`,
    ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200),
  });

  return ApiResponse.success(res, 200, 'Order accepted.', decorateVendorOrderForPortal(vo));
});

exports.rejectOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.id, ...match });
  if (!vo) throw new AppError('Order not found or not assigned to you.', 404);
  if (!['NEW_ASSIGNED', 'ASSIGNED'].includes(vo.status)) {
    throw new AppError('This order cannot be rejected in its current status.', 400);
  }
  if (!canTransition(vo.status, 'REJECTED')) throw new AppError('Invalid status transition.', 400);

  vo.status = 'REJECTED';
  vo.rejectReason = reason || 'Rejected by vendor';
  pushEmbeddedHistory(vo, 'REJECTED', req.user._id, 'User', vo.rejectReason);
  await vo.save();
  await appendAudit(vo._id, 'REJECTED', vo.rejectReason, req.user._id, 'User');

  const mo = await Order.findById(vo.masterOrder);
  if (mo) {
    mo.assignedVendor = null;
    if (['PROCESSING', 'READY_FOR_DISPATCH', 'PARTIALLY_DISPATCHED'].includes(mo.status)) {
      mo.status = 'VENDOR_ASSIGNMENT_PENDING';
    }
    mo.statusHistory.push({
      status: mo.status,
      changedBy: req.user._id,
      note: `Vendor rejected sub-order ${vo.orderNumber}. ${vo.rejectReason}`,
    });
    await mo.save();
  }

  notifyAllAdmins({
    type: 'ORDER_REJECTED',
    title: 'Vendor rejected order',
    message: `Sub-order ${vo.orderNumber} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    relatedVendorOrder: vo._id,
  }).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Vendor rejected ${vo.orderNumber}`,
    ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200),
  });

  return ApiResponse.success(res, 200, 'Order rejected. Admin has been notified.', decorateVendorOrderForPortal(vo));
});

exports.readyForDispatch = asyncHandler(async (req, res) => {
  const { estimatedDispatchDate, remarks } = req.body;
  if (!estimatedDispatchDate) throw new AppError('estimatedDispatchDate is required.', 400);

  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.id, ...match });
  if (!vo) throw new AppError('Order not found or not assigned to you.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not available for this order.', 400);
  if (!['ACCEPTED', 'CHANGES_REQUESTED'].includes(vo.status)) {
    throw new AppError('You can only submit ready-for-dispatch after acceptance or after admin requested changes.', 400);
  }
  if (!canTransition(vo.status, 'READY_FOR_DISPATCH')) throw new AppError('Invalid status transition.', 400);

  const packingFiles = [];
  const grouped = req.files || {};
  (grouped.packing || []).forEach((f) => {
    packingFiles.push({ url: f.path, cloudinaryId: f.filename, name: f.originalname || 'packing' });
  });
  const invList = grouped.invoice || [];
  const invoiceFile = invList[0];

  vo.preDispatch = {
    packingFiles,
    invoiceFileUrl: invoiceFile?.path,
    invoiceCloudinaryId: invoiceFile?.filename,
    remarks: remarks || undefined,
  };
  vo.expectedDispatchDate = new Date(estimatedDispatchDate);
  vo.status = 'READY_FOR_DISPATCH';
  vo.dispatchStatus = 'READY';
  pushEmbeddedHistory(vo, 'READY_FOR_DISPATCH', req.user._id, 'User', remarks || 'Vendor marked ready for dispatch.');
  await vo.save();
  await appendAudit(vo._id, 'READY_FOR_DISPATCH', remarks, req.user._id, 'User');

  await syncMasterOrderStatusFromVendorOrders(vo.masterOrder, {
    changedBy: req.user._id,
    note: `Sub-order ${vo.orderNumber} ready for dispatch.`,
  });

  notifyAllAdmins({
    type: 'READY_FOR_DISPATCH',
    title: 'Vendor ready for dispatch',
    message: `Vendor has marked order ${vo.orderNumber} ready for dispatch.`,
    relatedVendorOrder: vo._id,
  }).catch(() => {});

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Ready for dispatch ${vo.orderNumber}`,
    ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200),
  });

  return ApiResponse.success(res, 200, 'Marked ready for dispatch.', decorateVendorOrderForPortal(vo));
});

exports.markDispatched = asyncHandler(async (req, res) => {
  const {
    transporter_name: transporterName,
    vehicle_number: vehicleNumber,
    lr_number: lrNumber,
    tracking_number: trackingNumber,
    dispatch_date: dispatchDate,
  } = req.body;

  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.id, ...match });
  if (!vo) throw new AppError('Order not found or not assigned to you.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not available for this order.', 400);
  if (vo.deliveryType === 'structbay_delivery') {
    throw new AppError('Structbay handles pickup and delivery for this order (Type B). You do not need to mark dispatch.', 400);
  }
  if (vo.status !== 'SB_INVOICE_SENT') {
    throw new AppError('Dispatch is only allowed after Structbay has approved dispatch and sent invoice & e-way bill.', 400);
  }

  const proof = req.file;
  if (!proof) throw new AppError('Dispatch proof file is required.', 400);
  if (!transporterName || !lrNumber || !dispatchDate) {
    throw new AppError('transporter_name, lr_number, and dispatch_date are required.', 400);
  }

  vo.shipmentDispatch = {
    transporterName,
    vehicleNumber: vehicleNumber || undefined,
    lrNumber,
    trackingNumber: trackingNumber || undefined,
    dispatchDate: new Date(dispatchDate),
    proofUrl: proof.path,
    proofCloudinaryId: proof.filename,
  };
  vo.actualDispatchDate = new Date(dispatchDate);
  vo.status = 'DISPATCHED';
  vo.dispatchStatus = 'DISPATCHED';
  pushEmbeddedHistory(vo, 'DISPATCHED', req.user._id, 'User', 'Vendor marked order dispatched.');
  await vo.save();
  await appendAudit(vo._id, 'DISPATCHED', 'Dispatched with LR / transporter details', req.user._id, 'User');

  await syncMasterOrderStatusFromVendorOrders(vo.masterOrder, {
    changedBy: req.user._id,
    note: `Sub-order ${vo.orderNumber} dispatched (Type A).`,
  });

  let dispatch = await VendorDispatch.findOne({ vendorOrder: vo._id, vendor: req.user._id });
  const proofDoc = {
    documentType: 'dispatch_note',
    documentName: 'dispatch_proof',
    documentUrl: proof.path,
    cloudinaryId: proof.filename,
  };
  if (!dispatch) {
    dispatch = await VendorDispatch.create({
      vendorOrder: vo._id,
      vendor: req.user._id,
      dispatchType: vo.deliveryType === 'structbay_delivery' ? 'structbay_pickup' : 'vendor_delivery',
      dispatchDate: vo.shipmentDispatch.dispatchDate,
      trackingNumber: vo.shipmentDispatch.trackingNumber,
      courierPartner: vo.shipmentDispatch.transporterName,
      transporterName: vo.shipmentDispatch.transporterName,
      lrNumber: vo.shipmentDispatch.lrNumber,
      status: 'dispatched',
      createdBy: req.user._id,
      dispatchRemarks: `LR ${lrNumber}`,
      documents: [proofDoc],
      vehicleDetails: vehicleNumber ? { vehicleNumber } : undefined,
    });
  } else {
    dispatch.status = 'dispatched';
    dispatch.dispatchDate = vo.shipmentDispatch.dispatchDate;
    dispatch.trackingNumber = vo.shipmentDispatch.trackingNumber;
    dispatch.courierPartner = vo.shipmentDispatch.transporterName;
    dispatch.transporterName = vo.shipmentDispatch.transporterName;
    dispatch.lrNumber = vo.shipmentDispatch.lrNumber;
    if (!dispatch.vehicleDetails) dispatch.vehicleDetails = {};
    if (vehicleNumber) dispatch.vehicleDetails.vehicleNumber = vehicleNumber;
    dispatch.documents.push(proofDoc);
    await dispatch.save();
  }

  notifyAllAdmins({
    type: 'ORDER_DISPATCHED',
    title: 'Order dispatched',
    message: `Vendor dispatched sub-order ${vo.orderNumber}.`,
    relatedVendorOrder: vo._id,
  }).catch(() => {});

  await notifyCustomerMaster(vo.masterOrder, {
    title: 'Order shipped',
    message: `Your order ${vo.orderNumber} is on the way.`,
    type: 'DISPATCH',
  });

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Dispatched ${vo.orderNumber}`,
    ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200),
  });

  return ApiResponse.success(res, 200, 'Marked dispatched.', decorateVendorOrderForPortal(vo));
});

exports.markDelivered = asyncHandler(async (req, res) => {
  const { delivery_date: deliveryDate } = req.body;
  if (!deliveryDate) throw new AppError('delivery_date is required.', 400);

  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.id, ...match });
  if (!vo) throw new AppError('Order not found or not assigned to you.', 404);
  if (!isWorkflowVendorOrder(vo)) throw new AppError('Workflow not available for this order.', 400);
  if (vo.deliveryType === 'structbay_delivery') {
    throw new AppError('Structbay confirms delivery for Type B orders. Upload POD is not required from vendor.', 400);
  }
  if (vo.status !== 'DISPATCHED') {
    throw new AppError('Proof of delivery can only be submitted after dispatch.', 400);
  }
  if (!req.file) throw new AppError('POD file is required.', 400);

  vo.deliveryProof = {
    ...(vo.deliveryProof && vo.deliveryProof.toObject ? vo.deliveryProof.toObject() : vo.deliveryProof || {}),
    deliveryDate: new Date(deliveryDate),
    podUrl: req.file.path,
    podCloudinaryId: req.file.filename,
  };
  vo.actualDeliveryDate = vo.deliveryProof.deliveryDate;
  vo.status = 'DELIVERED';
  vo.dispatchStatus = 'DELIVERED';
  pushEmbeddedHistory(vo, 'DELIVERED', req.user._id, 'User', 'Vendor uploaded POD and marked delivered.');
  await vo.save();
  await appendAudit(vo._id, 'DELIVERED', 'POD submitted', req.user._id, 'User');

  await syncMasterOrderStatusFromVendorOrders(vo.masterOrder, {
    changedBy: req.user._id,
    note: `Sub-order ${vo.orderNumber} delivered (Type A POD).`,
  });

  const dispatch = await VendorDispatch.findOne({ vendorOrder: vo._id, vendor: req.user._id });
  if (dispatch) {
    dispatch.status = 'delivered';
    dispatch.deliveryProof.push({
      type: 'pod',
      url: req.file.path,
      cloudinaryId: req.file.filename,
    });
    await dispatch.save();
  }

  notifyAllAdmins({
    type: 'ORDER_DELIVERED',
    title: 'Vendor marked delivered',
    message: `Vendor marked sub-order ${vo.orderNumber} delivered with POD.`,
    relatedVendorOrder: vo._id,
  }).catch(() => {});

  await notifyCustomerMaster(vo.masterOrder, {
    title: 'Order delivered',
    message: `Materials for ${vo.orderNumber} are marked delivered.`,
    type: 'DELIVERY',
  });

  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'VendorOrder',
    targetId: vo._id.toString(),
    description: `Delivered ${vo.orderNumber} (POD)`,
    ipAddress: req.ip,
    platform: (req.get('user-agent') || 'WEB').slice(0, 200),
  });

  return ApiResponse.success(res, 200, 'Delivery recorded.', decorateVendorOrderForPortal(vo));
});
