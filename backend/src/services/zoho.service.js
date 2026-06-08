const axios       = require('axios');
const logger      = require('../config/logger');
const ZohoSyncLog = require('../models/ZohoSyncLog');

// ─── Token Cache ──────────────────────────────────────────────────────────────
let _accessToken    = null;
let _tokenExpiresAt = 0;

const getAccessToken = async () => {
  if (_accessToken && Date.now() < _tokenExpiresAt - 60000) return _accessToken;

  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ACCOUNTS_URL } = process.env;
  if (!ZOHO_CLIENT_ID) { logger.warn('Zoho credentials not configured.'); return null; }

  try {
    const res = await axios.post(`${ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in'}/oauth/v2/token`, null, {
      params: {
        grant_type:    'refresh_token',
        client_id:     ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        refresh_token: ZOHO_REFRESH_TOKEN,
      },
    });
    _accessToken    = res.data.access_token;
    _tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
    return _accessToken;
  } catch (err) {
    logger.error(`Zoho token refresh failed: ${err.message}`);
    return null;
  }
};

const booksHeaders = async () => {
  const token = await getAccessToken();
  if (!token) return null;
  return { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' };
};

const BOOKS_URL = () => `https://books.zoho.in/api/v3`;
const INV_URL   = () => `https://inventory.zoho.in/api/v1`;
const ORG       = () => process.env.ZOHO_ORG_ID;

// ─── Safe sync wrapper ────────────────────────────────────────────────────────
const syncOp = async ({ module: mod, operation, referenceId, zohoEntity, fn }) => {
  const log = await ZohoSyncLog.create({ module: mod, operation, referenceId, zohoEntity, status: 'PENDING' });
  try {
    const result = await fn();
    await ZohoSyncLog.findByIdAndUpdate(log._id, {
      status: 'SUCCESS', zohoId: result?.id || result?.[zohoEntity]?.id,
      responsePayload: result,
    });
    return result;
  } catch (err) {
    await ZohoSyncLog.findByIdAndUpdate(log._id, {
      status: 'FAILED', errorMessage: err.message,
      responsePayload: err.response?.data,
    });
    logger.error(`Zoho ${mod}/${operation} failed: ${err.message}`);
    return null;
  }
};

// ─── ZOHO BOOKS ───────────────────────────────────────────────────────────────

const createBooksCustomer = async ({ name, email, phone, gst }) =>
  syncOp({ module: 'BOOKS', operation: 'CREATE_CUSTOMER', referenceId: email, zohoEntity: 'contact', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${BOOKS_URL()}/contacts?organization_id=${ORG()}`,
      { contact_name: name, email, phone, gst_no: gst, contact_type: 'customer' },
      { headers });
    return res.data.contact;
  }});

const createBooksInvoice = async ({ zohoCustomerId, lineItems, orderId, gstTotal, grandTotal }) =>
  syncOp({ module: 'BOOKS', operation: 'CREATE_INVOICE', referenceId: orderId, zohoEntity: 'invoice', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${BOOKS_URL()}/invoices?organization_id=${ORG()}`, {
      customer_id: zohoCustomerId,
      reference_number: orderId,
      line_items: lineItems.map((i) => ({
        name: i.name, quantity: i.quantity,
        rate: i.unitPrice, tax_percentage: i.gstPercentage || 18,
      })),
    }, { headers });
    return res.data.invoice;
  }});

const createCreditNote = async ({ zohoCustomerId, amount, reason, referenceId }) =>
  syncOp({ module: 'BOOKS', operation: 'CREATE_CREDIT_NOTE', referenceId, zohoEntity: 'creditnote', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${BOOKS_URL()}/creditnotes?organization_id=${ORG()}`, {
      customer_id: zohoCustomerId, reason,
      line_items: [{ name: reason, quantity: 1, rate: amount }],
    }, { headers });
    return res.data.creditnote;
  }});

const recordPayment = async ({ zohoInvoiceId, amount, paymentDate, paymentMode, referenceId }) =>
  syncOp({ module: 'BOOKS', operation: 'CREATE_PAYMENT', referenceId, zohoEntity: 'payment', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${BOOKS_URL()}/customerpayments?organization_id=${ORG()}`, {
      invoices: [{ invoice_id: zohoInvoiceId, amount_applied: amount }],
      amount, payment_mode: paymentMode || 'online', date: paymentDate,
      reference_number: referenceId,
    }, { headers });
    return res.data.payment;
  }});

// ─── ZOHO INVENTORY ───────────────────────────────────────────────────────────

const syncProduct = async ({ productId, name, sku, rate, description }) =>
  syncOp({ module: 'INVENTORY', operation: 'SYNC_PRODUCT', referenceId: productId, zohoEntity: 'item', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${INV_URL()}/items?organization_id=${ORG()}`,
      { name, sku, rate, description, item_type: 'inventory' },
      { headers });
    return res.data.item;
  }});

const syncInventoryLevel = async ({ zohoItemId, quantity, warehouseId, referenceId }) =>
  syncOp({ module: 'INVENTORY', operation: 'SYNC_INVENTORY', referenceId, zohoEntity: 'adjustment', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${INV_URL()}/inventoryadjustments?organization_id=${ORG()}`,
      {
        reason: 'StructBay stock sync',
        date: new Date().toISOString().split('T')[0],
        line_items: [{ item_id: zohoItemId, quantity_adjusted: quantity, warehouse_id: warehouseId }],
      },
      { headers });
    return res.data;
  }});

const syncOrder = async ({ orderId, zohoCustomerId, lineItems, grandTotal, orderDate }) =>
  syncOp({ module: 'INVENTORY', operation: 'SYNC_ORDER', referenceId: orderId, zohoEntity: 'salesorder', fn: async () => {
    const headers = await booksHeaders();
    if (!headers) return null;
    const res = await axios.post(`${INV_URL()}/salesorders?organization_id=${ORG()}`, {
      customer_id: zohoCustomerId,
      reference_number: orderId,
      date: orderDate || new Date().toISOString().split('T')[0],
      line_items: lineItems.map((i) => ({ item_id: i.zohoItemId, quantity: i.quantity, rate: i.unitPrice })),
    }, { headers });
    return res.data.salesorder;
  }});

module.exports = {
  getAccessToken,
  createBooksCustomer,
  createBooksInvoice,
  createCreditNote,
  recordPayment,
  syncProduct,
  syncInventoryLevel,
  syncOrder,
};
