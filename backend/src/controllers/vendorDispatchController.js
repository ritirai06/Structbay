const VendorDispatch = require('../models/VendorDispatch');
const VendorOrder = require('../models/VendorOrder');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');

// @desc    Create Dispatch Entry
// @route   POST /api/v1/vendor/dispatch
exports.createDispatch = async (req, res) => {
  const {
    orderId, dispatchType,
    vehicleNumber, vehicleType, driverName, driverPhone, driverLicense,
    pickupAddress, contactPerson, contactNumber, pickupTime,
    dispatchDate, expectedDeliveryDate, dispatchRemarks,
  } = req.body;

  const order = await VendorOrder.findOne({ _id: orderId, vendor: req.user._id });
  if (!order) return ApiResponse.notFound(res, 'Order not found.');

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

  order.dispatchStatus = 'ready';
  order.status = 'ready_for_dispatch';
  order.expectedDispatchDate = dispatchDate;
  order.statusHistory.push({
    status: 'ready_for_dispatch', updatedBy: req.user._id, updatedByModel: 'User',
    remarks: dispatchRemarks, timestamp: new Date(),
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

  const oldStatus = dispatch.status;
  dispatch.status = status;
  if (trackingNumber) dispatch.trackingNumber = trackingNumber;
  if (courierPartner) dispatch.courierPartner = courierPartner;
  if (remarks) dispatch.dispatchRemarks = remarks;
  dispatch.updatedBy = req.user._id;
  dispatch.updatedByModel = 'User';
  await dispatch.save();

  const order = await VendorOrder.findById(dispatch.vendorOrder);
  if (status === 'dispatched') {
    order.status = 'dispatched'; order.dispatchStatus = 'dispatched'; order.actualDispatchDate = new Date();
  } else if (status === 'delivered') {
    order.status = 'material_delivered'; order.dispatchStatus = 'delivered'; order.actualDeliveryDate = new Date();
  }
  order.statusHistory.push({ status: order.status, updatedBy: req.user._id, updatedByModel: 'User', remarks, timestamp: new Date() });
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

  dispatch.deliveryProof.push({ type: type || 'photo', url: req.file.path, cloudinaryId: req.file.filename });
  if (receivedBy) dispatch.receivedBy = receivedBy;
  if (deliveryRemarks) dispatch.deliveryRemarks = deliveryRemarks;
  dispatch.receivedAt = new Date();
  await dispatch.save();

  const order = await VendorOrder.findById(dispatch.vendorOrder);
  order.status = 'material_delivered';
  order.actualDeliveryDate = new Date();
  order.statusHistory.push({
    status: 'material_delivered', updatedBy: req.user._id, updatedByModel: 'User',
    remarks: deliveryRemarks || 'Delivery proof uploaded', timestamp: new Date(),
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
  const dispatch = await VendorDispatch.findOne({
    vendorOrder: req.params.orderId, vendor: req.user._id,
  }).populate('vendorOrder', 'orderNumber customer deliveryAddress');

  if (!dispatch) return ApiResponse.notFound(res, 'No dispatch found for this order.');
  return ApiResponse.success(res, 200, 'Dispatch retrieved.', dispatch);
};

// @desc    Get All Dispatches
// @route   GET /api/v1/vendor/dispatch
exports.getAllDispatches = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { vendor: req.user._id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [dispatches, total] = await Promise.all([
    VendorDispatch.find(query)
      .populate('vendorOrder', 'orderNumber customer deliveryAddress')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    VendorDispatch.countDocuments(query),
  ]);

  return ApiResponse.success(res, 200, 'Dispatches retrieved.', dispatches, {
    page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)),
  });
};
