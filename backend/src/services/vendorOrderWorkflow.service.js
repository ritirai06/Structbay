const VendorOrderStatusAudit = require('../models/VendorOrderStatusAudit');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

const WORKFLOW_STATUSES = new Set([
  'NEW_ASSIGNED',
  'ACCEPTED',
  'REJECTED',
  'READY_FOR_DISPATCH',
  'CHANGES_REQUESTED',
  'DISPATCH_APPROVED',
  'VENDOR_INVOICE_SUBMITTED',
  'SB_INVOICE_SENT',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
]);

const TRANSITIONS = {
  NEW_ASSIGNED: ['ACCEPTED', 'REJECTED'],
  ASSIGNED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['READY_FOR_DISPATCH'],
  CHANGES_REQUESTED: ['READY_FOR_DISPATCH'],
  READY_FOR_DISPATCH: ['DISPATCH_APPROVED', 'CHANGES_REQUESTED'],
  DISPATCH_APPROVED: ['VENDOR_INVOICE_SUBMITTED'],
  VENDOR_INVOICE_SUBMITTED: ['SB_INVOICE_SENT'],
  SB_INVOICE_SENT: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
};

function isWorkflowVendorOrder(vo) {
  return !!(vo && Number(vo.workflowVersion) === 2);
}

function canTransition(fromStatus, toStatus) {
  const key = fromStatus === 'ASSIGNED' ? 'NEW_ASSIGNED' : fromStatus;
  const allowed = TRANSITIONS[key];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

async function appendAudit(vendorOrderId, status, remarks, changedBy, changedByModel) {
  await VendorOrderStatusAudit.create({
    vendorOrder: vendorOrderId,
    status,
    remarks: remarks || undefined,
    changedBy,
    changedByModel,
    changedAt: new Date(),
  });
}

function pushEmbeddedHistory(vo, status, updatedBy, model, note) {
  if (!vo.statusHistory) vo.statusHistory = [];
  vo.statusHistory.push({
    status,
    updatedBy,
    model,
    note,
    timestamp: new Date(),
  });
}

async function notifyCustomerMaster(orderId, { title, message, type = 'ORDER' }) {
  try {
    const mo = await Order.findById(orderId).select('customer orderNumber').lean();
    if (!mo?.customer) return;
    await Notification.create({
      customer: mo.customer,
      title,
      message,
      type,
      refId: mo.orderNumber || String(orderId),
    });
  } catch {
    /* non-blocking */
  }
}

module.exports = {
  WORKFLOW_STATUSES,
  TRANSITIONS,
  isWorkflowVendorOrder,
  canTransition,
  appendAudit,
  pushEmbeddedHistory,
  notifyCustomerMaster,
};
