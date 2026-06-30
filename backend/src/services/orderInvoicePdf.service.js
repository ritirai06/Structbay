/**
 * Customer order acknowledgement PDF — Structbay black / orange / white theme with main logo.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function getStructbayLogoPath() {
  const fromEnv = process.env.INVOICE_LOGO_PATH && String(process.env.INVOICE_LOGO_PATH).trim();
  const candidates = [
    fromEnv && path.resolve(fromEnv),
    path.resolve(__dirname, '../../../frontend/shared/assets/logos/Structbay-Logo-F-1.png'),
  ].filter(Boolean);
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) return filePath;
    } catch {
      /* try next */
    }
  }
  return null;
}

function formatINR(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

function formatVariationLine(variation) {
  if (!variation?.attributes) return '';
  return Object.values(variation.attributes).filter(Boolean).join(' · ');
}

/**
 * @param {import('mongoose').Document} order
 * @returns {Promise<Buffer>}
 */
function buildOrderAcknowledgementPdf(order) {
  const o = order.toObject ? order.toObject() : order;
  const addr = o.shippingAddress || {};
  const logoPath = getStructbayLogoPath();

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const orange = '#E85A00';
    const black = '#000000';
    const gray = '#666666';

    doc.save();
    doc.rect(0, 0, pageW, 88).fill(black);
    if (logoPath) {
      try {
        doc.image(logoPath, 48, 20, { height: 48 });
      } catch {
        doc.fillColor(orange).fontSize(20).font('Helvetica-Bold').text('Structbay', 48, 32);
      }
    } else {
      doc.fillColor(orange).fontSize(20).font('Helvetica-Bold').text('Structbay', 48, 32);
    }
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text('Order acknowledgement', pageW - 220, 28, { width: 172, align: 'right' });
    doc.font('Helvetica').fontSize(10)
      .text(String(o.orderNumber || ''), pageW - 220, 46, { width: 172, align: 'right' });
    doc.restore();

    let y = 108;
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(
        'Thank you for your order. Below is a summary for your records. Official tax invoices may be issued at dispatch or delivery.',
        48,
        y,
        { width: pageW - 96, lineGap: 2 }
      );
    y = doc.y + 18;

    const colW = (pageW - 96 - 12) / 2;
    doc.fillColor(black).fontSize(9).font('Helvetica-Bold').text('BILL TO / SHIP TO', 48, y);
    doc.text('ORDER DETAILS', 48 + colW + 12, y);
    y += 14;

    const addrLines = [
      addr.name || '—',
      addr.line1 || '',
      addr.line2 || '',
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.pincode ? `PIN: ${addr.pincode}` : '',
      addr.phone ? `Phone: ${addr.phone}` : '',
    ].filter(Boolean);

    const detailLines = [
      `Order no. ${o.orderNumber || '—'}`,
      `Date ${formatDate(o.createdAt)}`,
      `City ${o.city?.name || '—'}`,
      `Payment ${o.paymentMethod || '—'} · ${o.paymentStatus || '—'}`,
      `Status ${o.status || '—'}`,
    ];

    doc.font('Helvetica').fontSize(9).fillColor(black);
    const boxTop = y;
    doc.roundedRect(48, boxTop, colW, 88, 6).strokeColor('#e5e5e5').lineWidth(1).stroke();
    doc.roundedRect(48 + colW + 12, boxTop, colW, 88, 6).stroke();
    doc.text(addrLines.join('\n'), 56, boxTop + 8, { width: colW - 16, lineGap: 2 });
    doc.text(detailLines.join('\n'), 56 + colW + 12, boxTop + 8, { width: colW - 16, lineGap: 2 });
    y = boxTop + 100;

    doc.fillColor(black).fontSize(10).font('Helvetica-Bold');
    const cols = { item: 48, qty: 320, rate: 400, amt: pageW - 48 - 80 };
    doc.text('Item', cols.item, y);
    doc.text('Qty', cols.qty, y, { width: 40, align: 'center' });
    doc.text('Rate', cols.rate, y, { width: 70, align: 'right' });
    doc.text('Amount', cols.amt, y, { width: 80, align: 'right' });
    y += 16;
    doc.moveTo(48, y).lineTo(pageW - 48, y).strokeColor('#e5e5e5').stroke();
    y += 8;

    doc.font('Helvetica').fontSize(9).fillColor(black);
    for (const it of o.items || []) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 48;
      }
      const vLabel = it.variationLabel || formatVariationLine(it.variation);
      const itemText = vLabel ? `${it.name || '—'}\n${vLabel}` : String(it.name || '—');
      doc.text(itemText, cols.item, y, { width: 250, lineGap: 1 });
      const rowH = Math.max(28, doc.heightOfString(itemText, { width: 250 }) + 4);
      doc.text(String(it.quantity ?? ''), cols.qty, y, { width: 40, align: 'center' });
      doc.text(formatINR(it.unitPrice), cols.rate, y, { width: 70, align: 'right' });
      doc.font('Helvetica-Bold').text(formatINR(it.lineTotal), cols.amt, y, { width: 80, align: 'right' });
      doc.font('Helvetica');
      y += rowH + 6;
      doc.moveTo(48, y).lineTo(pageW - 48, y).strokeColor('#f0f0f0').stroke();
      y += 8;
    }

    y += 8;
    const totalsX = pageW - 48 - 200;
    doc.font('Helvetica').fontSize(10).fillColor(black);
    doc.text('Subtotal', totalsX, y);
    doc.text(formatINR(o.subtotal), totalsX + 100, y, { width: 100, align: 'right' });
    y += 16;
    doc.text('GST', totalsX, y);
    doc.text(formatINR(o.gstTotal), totalsX + 100, y, { width: 100, align: 'right' });
    y += 18;
    doc.font('Helvetica-Bold').fillColor(orange).fontSize(12);
    doc.text('Grand total', totalsX, y);
    doc.text(formatINR(o.grandTotal), totalsX + 100, y, { width: 100, align: 'right' });

    y += 36;
    doc.font('Helvetica').fontSize(8).fillColor(gray)
      .text(
        'Structbay · B2B marketplace · Generated electronically. Additional delivery charges may apply where notified.',
        48,
        y,
        { width: pageW - 96, align: 'center' }
      );

    doc.end();
  });
}

module.exports = { buildOrderAcknowledgementPdf, getStructbayLogoPath };
