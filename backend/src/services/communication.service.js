/**
 * StructBay — Communication Dispatch Service
 *
 * Dispatches notifications across EMAIL, WHATSAPP, SMS channels.
 *
 * Priority:
 *   1. Admin-configured templates in NotificationTemplate collection (DB)
 *   2. Built-in typed email functions (email.service.js) as fallback
 *      → These use the master template with CMS branding — always professional
 */

const NotificationTemplate = require('../models/NotificationTemplate');
const CommunicationLog     = require('../models/CommunicationLog');
const { sendEmail }        = require('./email.service');
const emailSvc             = require('./email.service');
const whatsappSvc          = require('./whatsapp.service');
const logger               = require('../config/logger');

// ─── Interpolate {{variable}} placeholders ────────────────────────────────────
const interpolate = (text = '', vars = {}) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

// ─── Built-in Fallback Email Functions ───────────────────────────────────────
/**
 * Maps event names to a function that sends the appropriate typed email.
 * These are used when no active DB template exists for the event.
 * All use the master template with branding from Admin CMS — nothing hardcoded.
 */
const FALLBACK_EMAIL_SENDERS = {
  ORDER_CONFIRMED: (to, vars) => emailSvc.sendOrderConfirmedEmail({
    to,
    name:        vars.customerName || 'Customer',
    orderNumber: vars.orderNumber  || vars.orderId || '',
    amount:      vars.totalAmount  || vars.amount  || 0,
    orderId:     vars.orderId      || vars.orderNumber || '',
  }),

  PAYMENT_SUCCESSFUL: (to, vars) => emailSvc.sendPaymentSuccessEmail({
    to,
    name:          vars.customerName || 'Customer',
    orderNumber:   vars.orderNumber  || '',
    amount:        vars.amount       || vars.totalAmount || 0,
    transactionId: vars.transactionId || '',
    orderId:       vars.orderId || vars.orderNumber || '',
  }),

  PAYMENT_FAILED: (to, vars) => emailSvc.sendPaymentFailedEmail({
    to,
    name:        vars.customerName || 'Customer',
    orderNumber: vars.orderNumber  || '',
    amount:      vars.amount       || vars.totalAmount || 0,
    orderId:     vars.orderId      || vars.orderNumber || '',
  }),

  RFQ_SUBMITTED: (to, vars) => emailSvc.sendRFQSubmittedEmail({
    to,
    name:        vars.customerName || 'Customer',
    rfqId:       vars.rfqId       || '',
    rfqNumber:   vars.rfqNumber   || vars.rfqId || '',
    productName: vars.productName || '',
  }),

  RFQ_APPROVED: (to, vars) => emailSvc.sendRFQApprovedEmail({
    to,
    name:        vars.customerName || 'Customer',
    rfqNumber:   vars.rfqNumber   || vars.rfqId || '',
    rfqId:       vars.rfqId       || '',
    vendorQuote: vars.vendorQuote || '',
  }),

  RFQ_REJECTED: (to, vars) => emailSvc.sendRFQRejectedEmail({
    to,
    name:      vars.customerName || 'Customer',
    rfqNumber: vars.rfqNumber   || vars.rfqId || '',
    rfqId:     vars.rfqId       || '',
    reason:    vars.reason      || '',
  }),

  BULK_ENQUIRY_SUBMITTED: (to, vars) => emailSvc.sendBulkEnquiryEmail({
    to,
    name:      vars.customerName || 'Customer',
    enquiryId: vars.enquiryId   || '',
  }),

  DISPATCH_UPDATE: (to, vars) => emailSvc.sendOutForDeliveryEmail({
    to,
    name:            vars.customerName  || 'Customer',
    orderNumber:     vars.orderNumber   || '',
    orderId:         vars.orderId       || vars.orderNumber || '',
    deliveryDetails: vars.deliveryDetails || '',
  }),

  DELIVERED: (to, vars) => emailSvc.sendOrderDeliveredEmail({
    to,
    name:        vars.customerName || 'Customer',
    orderNumber: vars.orderNumber  || '',
    orderId:     vars.orderId      || vars.orderNumber || '',
  }),

  ORDER_CANCELLED: (to, vars) => emailSvc.sendOrderCancelledEmail({
    to,
    name:        vars.customerName || 'Customer',
    orderNumber: vars.orderNumber  || '',
    reason:      vars.reason       || '',
  }),

  FINANCE_APPLICATION: (to, vars) => emailSvc.sendEmail({
    to,
    subject: 'Finance Application Received — StructBay',
    html: `<p>Hi ${vars.customerName || 'Customer'}, your finance application has been received. Our team will contact you shortly.</p>`,
  }),

  PROJECT_CREATED: (to, vars) => emailSvc.sendProjectCreatedEmail({
    to,
    name:        vars.customerName || 'Customer',
    projectName: vars.projectName  || 'Your Project',
  }),

  PROJECT_UPDATED: (to, vars) => emailSvc.sendProjectUpdatedEmail({
    to,
    name:        vars.customerName || 'Customer',
    projectName: vars.projectName  || 'Your Project',
  }),
};

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Dispatch a communication event to all active channels.
 * opts: { event, to: { email, phone }, vars, recipientRef, recipientType }
 */
const dispatch = async ({ event, to, vars = {}, recipientRef, recipientType = 'CUSTOMER' }) => {
  try {
    const templates = await NotificationTemplate.find({ event, isActive: true });

    // ── DB Templates (admin-configured) ──────────────────────────────────────
    for (const tpl of templates) {
      try {
        if (tpl.channel === 'EMAIL' && to.email) {
          const subject = interpolate(tpl.subject, vars);
          const html    = interpolate(tpl.htmlBody, vars);
          const result  = await sendEmail({ to: to.email, subject, html });
          await _log({
            channel: 'EMAIL', event, recipient: to.email, recipientType, recipientRef,
            templateId: tpl._id, subject, body: html,
            status: result ? 'SENT' : 'FAILED',
            providerRef: result?.messageId, sentAt: new Date(),
          });
        }

        if (tpl.channel === 'WHATSAPP' && to.phone) {
          await whatsappSvc.sendByEvent({ event, to: to.phone, vars, recipientRef, recipientType });
        }

        if (tpl.channel === 'SMS' && to.phone) {
          logger.info(`SMS dispatch (stub): ${event} → ${to.phone}`);
          await _log({
            channel: 'SMS', event, recipient: to.phone, recipientType, recipientRef,
            templateId: tpl._id, body: interpolate(tpl.body, vars),
            status: 'PENDING', sentAt: new Date(),
          });
        }
      } catch (innerErr) {
        logger.error(`Dispatch ${tpl.channel}/${event} error: ${innerErr.message}`);
      }
    }

    // ── Fallback: use built-in typed email if no EMAIL template in DB ────────
    const hasDbEmailTemplate = templates.some(t => t.channel === 'EMAIL');
    if (!hasDbEmailTemplate && to.email) {
      const fallbackFn = FALLBACK_EMAIL_SENDERS[event];
      if (fallbackFn) {
        try {
          const result = await fallbackFn(to.email, vars);
          await _log({
            channel: 'EMAIL', event, recipient: to.email, recipientType, recipientRef,
            subject: `[fallback] ${event}`,
            status: result ? 'SENT' : 'FAILED',
            providerRef: result?.messageId, sentAt: new Date(),
          });
          if (result) {
            logger.info(`Fallback email sent for event ${event} to ${to.email}`);
          }
        } catch (fallbackErr) {
          logger.error(`Fallback email failed for ${event}: ${fallbackErr.message}`);
        }
      }
    }

  } catch (err) {
    logger.error(`Communication dispatch failed for ${event}: ${err.message}`);
  }
};

// ─── Internal log helper ──────────────────────────────────────────────────────
const _log = (data) => CommunicationLog.create(data).catch(() => {});

// ─── Convenience wrappers ─────────────────────────────────────────────────────
const notifyOrderConfirmed  = (opts) => dispatch({ event: 'ORDER_CONFIRMED',          ...opts });
const notifyPaymentSuccess  = (opts) => dispatch({ event: 'PAYMENT_SUCCESSFUL',       ...opts });
const notifyPaymentFailed   = (opts) => dispatch({ event: 'PAYMENT_FAILED',           ...opts });
const notifyDispatchUpdate  = (opts) => dispatch({ event: 'DISPATCH_UPDATE',          ...opts });
const notifyDelivered       = (opts) => dispatch({ event: 'DELIVERED',                ...opts });
const notifyInvoiceReady    = (opts) => dispatch({ event: 'INVOICE_GENERATED',        ...opts });
const notifyFinanceApp      = (opts) => dispatch({ event: 'FINANCE_APPLICATION',      ...opts });
const notifyRFQSubmitted    = (opts) => dispatch({ event: 'RFQ_SUBMITTED',            ...opts });
const notifyRFQApproved     = (opts) => dispatch({ event: 'RFQ_APPROVED',             ...opts });
const notifyRFQRejected     = (opts) => dispatch({ event: 'RFQ_REJECTED',             ...opts });
const notifyBulkEnquiry     = (opts) => dispatch({ event: 'BULK_ENQUIRY_SUBMITTED',   ...opts });
const notifyOrderCancelled  = (opts) => dispatch({ event: 'ORDER_CANCELLED',          ...opts });
const notifyProjectCreated  = (opts) => dispatch({ event: 'PROJECT_CREATED',          ...opts });
const notifyProjectUpdated  = (opts) => dispatch({ event: 'PROJECT_UPDATED',          ...opts });

module.exports = {
  dispatch,
  notifyOrderConfirmed,
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyDispatchUpdate,
  notifyDelivered,
  notifyInvoiceReady,
  notifyFinanceApp,
  notifyRFQSubmitted,
  notifyRFQApproved,
  notifyRFQRejected,
  notifyBulkEnquiry,
  notifyOrderCancelled,
  notifyProjectCreated,
  notifyProjectUpdated,
};
