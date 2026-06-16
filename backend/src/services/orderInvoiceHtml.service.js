/**
 * Self-contained HTML for customer order acknowledgement / printable invoice.
 * Inline styles only — suitable for download and print.
 */

const fs = require('fs');
const path = require('path');

/** Same asset as customer/admin UI (`frontend/shared/assets/logos/…`). Cached for invoice HTML. */
let _logoDataUri = undefined;
function getStructBayLogoDataUri() {
  if (_logoDataUri !== undefined) return _logoDataUri;
  const fromEnv = process.env.INVOICE_LOGO_PATH && String(process.env.INVOICE_LOGO_PATH).trim();
  const candidates = [
    fromEnv && path.resolve(fromEnv),
    path.resolve(__dirname, '../../../frontend/shared/assets/logos/Structbay-Logo-F-1.png'),
  ].filter(Boolean);
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const b64 = fs.readFileSync(filePath).toString('base64');
        _logoDataUri = `data:image/png;base64,${b64}`;
        return _logoDataUri;
      }
    } catch {
      /* try next */
    }
  }
  _logoDataUri = '';
  return _logoDataUri;
}

function esc(s) {
  if (s == null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatVariationLine(variation) {
  if (!variation || !variation.attributes) return '';
  const vals = Object.values(variation.attributes || {}).filter(Boolean);
  return vals.join(' · ');
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

/**
 * @param {import('mongoose').Document} order — populated city, items.product, items.variation
 */
function buildOrderAcknowledgementHtml(order) {
  const o = order.toObject ? order.toObject() : order;
  const addr = o.shippingAddress || {};
  const cityLabel = o.city?.name ? `${esc(o.city.name)}${o.city.state ? `, ${esc(o.city.state)}` : ''}` : '';
  const logoUri = getStructBayLogoDataUri();

  const rows = (o.items || [])
    .map((it) => {
      const vLabel = formatVariationLine(it.variation);
      const desc = [esc(it.name), vLabel ? `<span style="color:#5c5c5c;font-size:12px;display:block;margin-top:4px">${esc(vLabel)}</span>` : '']
        .filter(Boolean)
        .join('');
      return `<tr>
        <td style="padding:12px 10px;border-bottom:1px solid #eee;vertical-align:top">${desc}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:center">${esc(it.quantity)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatINR(it.unitPrice)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;font-weight:600">${formatINR(it.lineTotal)}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>StructBay — Order ${esc(o.orderNumber)}</title>
  <style>
    @media print {
      body { background: #fff !important; }
      .sb-wrap { box-shadow: none !important; }
    }
  </style>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Ubuntu,sans-serif;background:#FAF3E1;color:#171717;">
  <div class="sb-wrap" style="max-width:800px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(23,23,23,.08);">
    <div style="background:#171717;color:#FAF3E1;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div style="display:flex;align-items:center;gap:14px;min-width:0;">
        ${
          logoUri
            ? `<img src="${logoUri}" alt="StructBay" width="160" height="48" style="height:44px;width:auto;max-width:min(200px,42vw);object-fit:contain;display:block;flex-shrink:0;" />`
            : `<div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;"><span style="color:#FE5E00">Struct</span>Bay</div>`
        }
        <div style="min-width:0;">
          <div style="font-size:12px;opacity:.85;line-height:1.35;">India's Premier B2B Construction Materials Marketplace</div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;opacity:.9;">
        <div style="font-weight:700;font-size:14px;">Order acknowledgement</div>
        <div>${esc(o.orderNumber)}</div>
      </div>
    </div>

    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:13px;color:#444;line-height:1.5;">
        Thank you for your order. Below is a summary for your records.
        <strong style="color:#171717;">Official tax invoices</strong> (where applicable) may be issued at dispatch or delivery as per StructBay and vendor fulfilment.
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#FAF3E1;border-radius:12px;padding:14px 16px;border:1px solid #eadfcc;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#7a6a52;font-weight:700;margin-bottom:8px;">Bill to / Ship to</div>
          <div style="font-size:14px;line-height:1.55;">
            <strong>${esc(addr.name || '—')}</strong><br/>
            ${esc(addr.line1 || '')}${addr.line1 ? '<br/>' : ''}
            ${esc(addr.line2 || '')}${addr.line2 ? '<br/>' : ''}
            ${esc([addr.city, addr.state].filter(Boolean).join(', '))}${addr.city || addr.state ? '<br/>' : ''}
            PIN: ${esc(addr.pincode || '—')}<br/>
            ${addr.phone ? `Phone: ${esc(addr.phone)}` : ''}
          </div>
        </div>
        <div style="background:#FAF3E1;border-radius:12px;padding:14px 16px;border:1px solid #eadfcc;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#7a6a52;font-weight:700;margin-bottom:8px;">Order details</div>
          <div style="font-size:14px;line-height:1.7;">
            <div><strong>Order no.</strong> ${esc(o.orderNumber)}</div>
            <div><strong>Date</strong> ${esc(formatDate(o.createdAt))}</div>
            <div><strong>Warehouse city</strong> ${cityLabel || '—'}</div>
            <div><strong>Payment</strong> ${esc(o.paymentMethod || '—')} · <strong>Status</strong> ${esc(o.paymentStatus || '—')}</div>
            <div><strong>Fulfilment</strong> ${esc(o.status || '—')}</div>
          </div>
        </div>
      </div>

      <div style="border:1px solid #eee;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#171717;color:#FAF3E1;">
              <th style="text-align:left;padding:12px 10px;font-weight:700;">Item</th>
              <th style="text-align:center;padding:12px 8px;font-weight:700;width:72px;">Qty</th>
              <th style="text-align:right;padding:12px 10px;font-weight:700;width:110px;">Rate</th>
              <th style="text-align:right;padding:12px 10px;font-weight:700;width:120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#888;">No line items.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="margin-top:20px;display:flex;justify-content:flex-end;">
        <div style="min-width:260px;background:#FAF3E1;border-radius:12px;padding:16px 18px;border:1px solid #eadfcc;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span>Subtotal</span><strong>${formatINR(o.subtotal)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
            <span>GST</span><strong>${formatINR(o.gstTotal)}</strong>
          </div>
          <div style="height:1px;background:#dccfb5;margin:10px 0;"></div>
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#FE5E00;">
            <span>Grand total</span><span>${formatINR(o.grandTotal)}</span>
          </div>
        </div>
      </div>

      <p style="margin:24px 0 0;font-size:11px;color:#777;line-height:1.5;border-top:1px solid #eee;padding-top:16px;">
        StructBay · B2B marketplace · This document is generated electronically and does not require a signature.
        Additional delivery charges may apply and are payable at site where notified.
      </p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildOrderAcknowledgementHtml };
