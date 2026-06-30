const axios = require('axios');
const OrderDocument = require('../models/OrderDocument');
const VendorOrder = require('../models/VendorOrder');
const VendorInvoice = require('../models/VendorInvoice');
const { cloudinary } = require('../config/cloudinary');

/** @param {string} url */
function publicIdFromCloudinaryUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    let rest = parts.slice(uploadIdx + 1);
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (!rest.length) return null;
    const last = rest[rest.length - 1];
    const withoutExt = last.replace(/\.[^.]+$/, '');
    rest[rest.length - 1] = withoutExt;
    return rest.join('/');
  } catch {
    return null;
  }
}

/**
 * @param {{ url?: string, cloudinaryId?: string|null }} file
 */
function signedCloudinaryUrl(file) {
  const publicId = file.cloudinaryId || publicIdFromCloudinaryUrl(file.url || '');
  if (!publicId) return file.url || null;
  const resourceType = (file.url || '').includes('/raw/') ? 'raw' : 'image';
  for (const type of ['upload', 'authenticated', 'private']) {
    try {
      return cloudinary.url(publicId, {
        resource_type: resourceType,
        type,
        sign_url: true,
        secure: true,
      });
    } catch {
      /* try next */
    }
  }
  return file.url || null;
}

/**
 * Collect downloadable invoice files for a master order.
 * @param {import('mongoose').Document} order
 */
async function listOrderInvoiceFiles(order) {
  const files = [];
  const add = (label, url, kind, reference, cloudinaryId = null) => {
    if (!url || typeof url !== 'string') return;
    files.push({ label, url, kind, reference: reference || null, cloudinaryId });
  };

  add(
    'Structbay tax invoice',
    order.structbayInvoiceUrl || order.invoiceUrl,
    'Structbay_INVOICE',
    order.customerInvoiceNumber,
  );
  add('E-way bill', order.ewayBillUrl, 'EWAY_BILL', order.ewayBillNumber);

  const docs = await OrderDocument.find({
    masterOrder: order._id,
    visibleToCustomer: true,
    documentType: { $in: ['Structbay_INVOICE', 'TAX_INVOICE', 'EWAY_BILL', 'DELIVERY_CHALLAN', 'SHIPPING_LABEL'] },
  }).select('documentType label url documentReference cloudinaryId').lean();

  for (const d of docs) {
    add(d.label || d.documentType, d.url, d.documentType, d.documentReference, d.cloudinaryId);
  }

  const subOrders = await VendorOrder.find({ masterOrder: order._id }).select('_id orderNumber').lean();
  const subIds = subOrders.map((s) => s._id);
  if (subIds.length) {
    const invs = await VendorInvoice.find({
      vendorOrder: { $in: subIds },
      status: { $ne: 'replaced' },
    }).select('invoiceNumber invoiceUrl vendorTaxInvoiceNumber vendorOrder cloudinaryId').lean();

    for (const inv of invs) {
      const vo = subOrders.find((x) => String(x._id) === String(inv.vendorOrder));
      add(
        `Vendor invoice — ${vo?.orderNumber || 'sub-order'}`,
        inv.invoiceUrl,
        'VENDOR_INVOICE',
        inv.vendorTaxInvoiceNumber || inv.invoiceNumber,
        inv.cloudinaryId,
      );
    }
  }

  const seen = new Set();
  return files.filter((f) => {
    const key = `${f.kind}:${f.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {{ url?: string, cloudinaryId?: string|null, label?: string }} file
 * @returns {Promise<Buffer>}
 */
async function fetchInvoiceFileBuffer(file) {
  const signed = signedCloudinaryUrl(file);
  const candidates = [signed, file.url].filter(Boolean);
  let lastErr;
  for (const url of candidates) {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, maxRedirects: 5 });
      return Buffer.from(res.data);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Could not download invoice file.');
}

function safeFilename(label, reference) {
  const base = String(reference || label || 'invoice').replace(/[^\w.-]+/g, '_').slice(0, 80);
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

module.exports = {
  listOrderInvoiceFiles,
  fetchInvoiceFileBuffer,
  safeFilename,
};
