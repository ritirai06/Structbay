const VendorDispatch = require('../models/VendorDispatch');
const VendorOrder = require('../models/VendorOrder');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');
const { vendorOrderMatch } = require('../utils/vendorOrderAccess');
const { isWorkflowVendorOrder } = require('../services/vendorOrderWorkflow.service');
const { enrichDispatchRow, dispatchFromVendorOrder, rowFromVendorOrder } = require('../utils/vendorDispatchEnrich');

const VENDOR_ORDER_DISPATCH_SELECT =
  'orderNumber status shipmentDispatch deliveryAddress customerInfo deliveryType workflowVersion actualDispatchDate';
const DISPATCHED_ORDER_STATUSES = ['DISPATCHED', 'DELIVERED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];

// @desc    Create Dispatch Entry
// @route   POST /api/v1/vendor/dispatch
exports.createDispatch = async (req, res) => {
  const {
    orderId, dispatchType,
    vehicleNumber, vehicleType, driverName, driverPhone, driverLicense,
    pickupAddress, contactPerson, contactNumber, pickupTime,
    dispatchDate, expectedDeliveryDate, dispatchRemarks,
  } = req.body;

  const match = await vendorOrderMatch(req.user);
  const order = await VendorOrder.findOne({ _id: orderId, ...match });
  if (!order) return ApiResponse.notFound(res, 'Order not found.');

  if (isWorkflowVendorOrder(order)) {
    if (['NEW_ASSIGNED', 'ASSIGNED'].includes(order.status)) {
      return ApiResponse.badRequest(res, 'Accept the order first, then use Ready for dispatch from the vendor workflow.');
    }
    if (['ACCEPTED', 'CHANGES_REQUESTED'].includes(order.status)) {
      return ApiResponse.badRequest(
        res,
        'Use POST /api/v1/vendor/orders/:id/workflow/ready-dispatch (packing, optional invoice, estimated dispatch date).'
      );
    }
    return ApiResponse.badRequest(
      res,
      'This sub-order uses the Structbay workflow — use Mark dispatched / workflow actions instead of the legacy dispatch create endpoint.'
    );
  }

  const data = {
    vendorOrder: orderId, vendor: req.user._id,
    dispatchType, dispatchDate, expectedDeliveryDate, dispatchRemarks,
    status: 'ready_for_dispatch', createdBy: req.user._id,
  };

  if (dispatchType === 'vendor_delivery') {
    data.vehicleDetails = { vehicleNumber, vehicleType, driverName, driverPhone, driverLicense };
  } else {
    data.pickupDetails = { pickupAddress, contactPerson, contactNumber, pickupTime, materialReadyStatus: 'ready' };
  }

  const dispatch = await VendorDispatch.create(data);

  order.dispatchStatus = 'READY';
  order.status = 'READY_FOR_DISPATCH';
  order.expectedDispatchDate = dispatchDate;
  order.statusHistory.push({
    status: 'READY_FOR_DISPATCH',
    updatedBy: req.user._id,
    model: 'User',
    note: dispatchRemarks || 'Dispatch details submitted',
    timestamp: new Date(),
  });
  await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'dispatch_update',
    description: `Created dispatch for order ${order.orderNumber}`,
    relatedOrder: orderId, relatedDispatch: dispatch._id, ipAddress: req.ip,
  });

  return ApiResponse.created(res, 'Dispatch created successfully.', dispatch);
};

// @desc    Update Dispatch Status
// @route   PUT /api/v1/vendor/dispatch/:id/status
exports.updateDispatchStatus = async (req, res) => {
  const { status, remarks, trackingNumber, courierPartner } = req.body;

  const dispatch = await VendorDispatch.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!dispatch) return ApiResponse.notFound(res, 'Dispatch not found.');

  const order = await VendorOrder.findById(dispatch.vendorOrder);
  if (!order) return ApiResponse.notFound(res, 'Order not found.');
  if (isWorkflowVendorOrder(order)) {
    return ApiResponse.badRequest(
      res,
      'This sub-order uses the Structbay workflow — update dispatch status from the workflow steps instead of this legacy endpoint.'
    );
  }

  const oldStatus = dispatch.status;
  dispatch.status = status;
  if (trackingNumber) dispatch.trackingNumber = trackingNumber;
  if (courierPartner) dispatch.courierPartner = courierPartner;
  if (remarks) dispatch.dispatchRemarks = remarks;
  dispatch.updatedBy = req.user._id;
  dispatch.updatedByModel = 'User';
  await dispatch.save();

  if (status === 'dispatched') {
    order.status = 'IN_TRANSIT';
    order.dispatchStatus = 'DISPATCHED';
    order.actualDispatchDate = new Date();
  } else if (status === 'in_transit') {
    order.status = 'IN_TRANSIT';
  } else if (status === 'out_for_delivery') {
    order.status = 'OUT_FOR_DELIVERY';
  } else if (status === 'delivered') {
    order.status = 'DELIVERED';
    order.dispatchStatus = 'DELIVERED';
    order.actualDeliveryDate = new Date();
  }
  order.statusHistory.push({
    status: order.status,
    updatedBy: req.user._id,
    model: 'User',
    note: remarks || undefined,
    timestamp: new Date(),
  });
  await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'dispatch_update',
    description: `Dispatch status: ${oldStatus} → ${status}`,
    relatedOrder: dispatch.vendorOrder, relatedDispatch: dispatch._id,
    changes: { field: 'status', oldValue: oldStatus, newValue: status },
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Dispatch status updated.', dispatch);
};

// @desc    Upload Dispatch Document
// @route   POST /api/v1/vendor/dispatch/:id/documents
exports.uploadDispatchDocuments = async (req, res) => {
  const { documentType, documentName } = req.body;
  const dispatch = await VendorDispatch.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!dispatch) return ApiResponse.notFound(res, 'Dispatch not found.');
  if (!req.file) return ApiResponse.badRequest(res, 'Please upload a document.');

  dispatch.documents.push({
    documentType: documentType || 'other',
    documentName: documentName || req.file.originalname,
    documentUrl: req.file.path,
    cloudinaryId: req.file.filename,
  });
  await dispatch.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'document_upload',
    description: `Uploaded dispatch document: ${documentType}`,
    relatedOrder: dispatch.vendorOrder, relatedDispatch: dispatch._id, ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Document uploaded.', dispatch);
};

// @desc    Upload Delivery Proof
// @route   POST /api/v1/vendor/dispatch/:id/delivery-proof
exports.uploadDeliveryProof = async (req, res) => {
  const { type, receivedBy, deliveryRemarks } = req.body;
  const dispatch = await VendorDispatch.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!dispatch) return ApiResponse.notFound(res, 'Dispatch not found.');
  if (!req.file) return ApiResponse.badRequest(res, 'Please upload delivery proof.');

  const order = await VendorOrder.findById(dispatch.vendorOrder);
  if (!order) return ApiResponse.notFound(res, 'Order not found.');
  if (isWorkflowVendorOrder(order)) {
    if (order.status === 'DISPATCHED') {
      return ApiResponse.badRequest(
        res,
        'Use POST /api/v1/vendor/orders/:id/workflow/mark-delivered to upload POD for this workflow order.'
      );
    }
    return ApiResponse.badRequest(res, 'Delivery proof for this order is handled via the Structbay vendor workflow.');
  }

  dispatch.deliveryProof.push({ type: type || 'photo', url: req.file.path, cloudinaryId: req.file.filename });
  if (receivedBy) dispatch.receivedBy = receivedBy;
  if (deliveryRemarks) dispatch.deliveryRemarks = deliveryRemarks;
  dispatch.receivedAt = new Date();
  await dispatch.save();

  order.status = 'DELIVERED';
  order.dispatchStatus = 'DELIVERED';
  order.actualDeliveryDate = new Date();
  order.statusHistory.push({
    status: 'DELIVERED',
    updatedBy: req.user._id,
    model: 'User',
    note: deliveryRemarks || 'Delivery proof uploaded',
    timestamp: new Date(),
  });
  await order.save();

  await VendorActivityLog.create({
    vendor: req.user._id, action: 'dispatch_update',
    description: 'Uploaded delivery proof',
    relatedOrder: dispatch.vendorOrder, relatedDispatch: dispatch._id, ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Delivery proof uploaded.', dispatch);
};

// @desc    Get Dispatch by Order
// @route   GET /api/v1/vendor/dispatch/order/:orderId
exports.getDispatchByOrder = async (req, res) => {
  const match = await vendorOrderMatch(req.user);
  const vo = await VendorOrder.findOne({ _id: req.params.orderId, ...match }).select(
    VENDOR_ORDER_DISPATCH_SELECT
  );
  if (!vo) return ApiResponse.notFound(res, 'Order not found or not assigned to you.');

  const dispatch = await VendorDispatch.findOne({
    vendorOrder: vo._id,
    vendor: req.user._id,
  }).populate('vendorOrder', VENDOR_ORDER_DISPATCH_SELECT);

  if (dispatch) {
    return ApiResponse.success(res, 200, 'Dispatch retrieved.', enrichDispatchRow(dispatch));
  }

  if (DISPATCHED_ORDER_STATUSES.includes(String(vo.status || '').toUpperCase())) {
    const row = rowFromVendorOrder(vo);
    if (row) return ApiResponse.success(res, 200, 'Dispatch retrieved.', row);
  }

  const synthetic = dispatchFromVendorOrder(vo);
  if (synthetic) {
    return ApiResponse.success(res, 200, 'Dispatch retrieved.', synthetic);
  }

  return ApiResponse.notFound(res, 'No dispatch found for this order.');
};

// @desc    Get All Dispatches
// @route   GET /api/v1/vendor/dispatch
exports.getAllDispatches = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const match = await vendorOrderMatch(req.user);
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);

  const orderFilter = { ...match, status: { $in: DISPATCHED_ORDER_STATUSES } };
  if (status === 'dispatched') orderFilter.status = 'DISPATCHED';
  if (status === 'delivered') orderFilter.status = { $in: ['DELIVERED', 'COMPLETED'] };

  const [orders, total] = await Promise.all([
    VendorOrder.find(orderFilter)
      .select(VENDOR_ORDER_DISPATCH_SELECT)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    VendorOrder.countDocuments(orderFilter),
  ]);

  const payload = orders.map((o) => rowFromVendorOrder(o)).filter(Boolean);

  return ApiResponse.success(res, 200, 'Dispatches retrieved.', payload, {
    page: parseInt(page, 10),
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1,
  });
};
