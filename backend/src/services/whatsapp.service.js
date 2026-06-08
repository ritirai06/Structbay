const axios           = require('axios');
const logger          = require('../config/logger');
const CommunicationLog = require('../models/CommunicationLog');
const NotificationTemplate = require('../models/NotificationTemplate');

const BASE_URL = 'https://graph.facebook.com/v19.0';
const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN    = () => process.env.WHATSAPP_ACCESS_TOKEN;

// ─── Interpolate template body with variables ─────────────────────────────────
const interpolate = (text, vars = {}) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

// ─── Send a free-form text message (utility / testing) ────────────────────────
const sendTextMessage = async (to, text) => {
  if (!TOKEN() || !PHONE_ID()) {
    logger.warn('WhatsApp not configured — skipping message.');
    return null;
  }
  try {
    const res = await axios.post(
      `${BASE_URL}/${PHONE_ID()}/messages`,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
      { headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    logger.info(`WhatsApp text sent to ${to}`);
    return res.data;
  } catch (err) {
    logger.error(`WhatsApp text failed to ${to}: ${err.message}`);
    return null;
  }
};

// ─── Send a template message ──────────────────────────────────────────────────
const sendTemplateMessage = async (to, templateName, languageCode = 'en', components = []) => {
  if (!TOKEN() || !PHONE_ID()) {
    logger.warn('WhatsApp not configured — skipping template.');
    return null;
  }
  try {
    const res = await axios.post(
      `${BASE_URL}/${PHONE_ID()}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components },
      },
      { headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' } }
    );
    logger.info(`WhatsApp template "${templateName}" sent to ${to}`);
    return res.data;
  } catch (err) {
    logger.error(`WhatsApp template failed to ${to}: ${err.message}`);
    return null;
  }
};

// ─── High-level: send by event ────────────────────────────────────────────────
// Looks up NotificationTemplate by event+channel, interpolates vars, sends
const sendByEvent = async ({ event, to, vars = {}, recipientRef, recipientType = 'CUSTOMER' }) => {
  try {
    const template = await NotificationTemplate.findOne({ event, channel: 'WHATSAPP', isActive: true });

    let body = template?.body
      ? interpolate(template.body, vars)
      : `StructBay: ${event.replace(/_/g, ' ')} — ${JSON.stringify(vars)}`;

    let providerRef = null;
    let status      = 'PENDING';

    // Attempt send
    const result = await sendTextMessage(to, body);
    if (result?.messages?.[0]?.id) {
      providerRef = result.messages[0].id;
      status      = 'SENT';
    } else {
      status = 'FAILED';
    }

    // Log
    await CommunicationLog.create({
      channel: 'WHATSAPP', event,
      recipient: to, recipientType, recipientRef,
      templateId: template?._id || null,
      body, status, providerRef, sentAt: new Date(),
    }).catch(() => {});

    return result;
  } catch (err) {
    logger.error(`WhatsApp sendByEvent(${event}) failed: ${err.message}`);
    return null;
  }
};

module.exports = { sendTextMessage, sendTemplateMessage, sendByEvent };
