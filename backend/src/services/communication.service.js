const NotificationTemplate = require('../models/NotificationTemplate');
const CommunicationLog     = require('../models/CommunicationLog');
const { sendEmail }        = require('./email.service');
const whatsappSvc          = require('./whatsapp.service');
const logger               = require('../config/logger');

// ─── Interpolate {{variable}} placeholders ────────────────────────────────────
const interpolate = (text = '', vars = {}) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

// ─── Dispatch a communication event to all active channels ───────────────────
// opts: { event, to: { email, phone }, vars, recipientRef, recipientType }
const dispatch = async ({ event, to, vars = {}, recipientRef, recipientType = 'CUSTOMER' }) => {
  try {
    const templates = await NotificationTemplate.find({ event, isActive: true });

    for (const tpl of templates) {
      try {
        if (tpl.channel === 'EMAIL' && to.email) {
          const subject = interpolate(tpl.subject, vars);
          const html    = interpolate(tpl.htmlBody, vars);
          const result  = await sendEmail({ to: to.email, subject, html });
          await _log({ channel: 'EMAIL', event, recipient: to.email, recipientType, recipientRef,
            templateId: tpl._id, subject, body: html,
            status: result ? 'SENT' : 'FAILED',
            providerRef: result?.messageId, sentAt: new Date() });
        }

        if (tpl.channel === 'WHATSAPP' && to.phone) {
          const body = interpolate(tpl.body, vars);
          await whatsappSvc.sendByEvent({ event, to: to.phone, vars, recipientRef, recipientType });
        }

        if (tpl.channel === 'SMS' && to.phone) {
          // SMS provider can be wired here (Twilio, MSG91, etc.)
          logger.info(`SMS dispatch (stub): ${event} → ${to.phone}`);
          await _log({ channel: 'SMS', event, recipient: to.phone, recipientType, recipientRef,
            templateId: tpl._id, body: interpolate(tpl.body, vars), status: 'PENDING', sentAt: new Date() });
        }
      } catch (innerErr) {
        logger.error(`Dispatch ${tpl.channel}/${event} error: ${innerErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Communication dispatch failed for ${event}: ${err.message}`);
  }
};

// ─── Internal log helper ──────────────────────────────────────────────────────
const _log = (data) => CommunicationLog.create(data).catch(() => {});

// ─── Convenience wrappers for common events ───────────────────────────────────
const notifyOrderConfirmed = (opts) => dispatch({ event: 'ORDER_CONFIRMED', ...opts });
const notifyPaymentSuccess = (opts) => dispatch({ event: 'PAYMENT_SUCCESSFUL', ...opts });
const notifyDispatchUpdate = (opts) => dispatch({ event: 'DISPATCH_UPDATE', ...opts });
const notifyDelivered      = (opts) => dispatch({ event: 'DELIVERED', ...opts });
const notifyInvoiceReady   = (opts) => dispatch({ event: 'INVOICE_GENERATED', ...opts });
const notifyFinanceApp     = (opts) => dispatch({ event: 'FINANCE_APPLICATION', ...opts });
const notifyRFQSubmitted   = (opts) => dispatch({ event: 'RFQ_SUBMITTED', ...opts });
const notifyBulkEnquiry    = (opts) => dispatch({ event: 'BULK_ENQUIRY_SUBMITTED', ...opts });

module.exports = {
  dispatch,
  notifyOrderConfirmed,
  notifyPaymentSuccess,
  notifyDispatchUpdate,
  notifyDelivered,
  notifyInvoiceReady,
  notifyFinanceApp,
  notifyRFQSubmitted,
  notifyBulkEnquiry,
};
