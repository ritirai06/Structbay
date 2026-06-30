/**
 * A6 shipping label PDF — Structbay marketplace parcel label (Amazon/Flipkart style).
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');

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

function fmtAddr(parts) {
  return parts.filter(Boolean).join(', ');
}

function line(doc, y, margin, pageW, color = '#cccccc') {
  doc.save().strokeColor(color).lineWidth(0.5)
    .moveTo(margin, y).lineTo(pageW - margin, y).stroke().restore();
}

/**
 * @param {object} data — label payload from shippingLabel.service
 * @returns {Promise<Buffer>}
 */
async function buildShippingLabelPdf(data) {
  const logoPath = getStructbayLogoPath();
  const orange = '#E85A00';
  const black = '#111111';
  const gray = '#555555';
  const margin = 24;
  const pageW = 298; // A6 width in pt
  const pageH = 420; // A6 height in pt

  const [barcodePng, qrPng] = await Promise.all([
    bwipjs.toBuffer({
      bcid: 'code128',
      text: String(data.barcodeValue || data.trackingNumber || ''),
      scale: 2,
      height: 12,
      includetext: true,
      textsize: 8,
      textxalign: 'center',
    }),
    QRCode.toBuffer(String(data.qrValue || ''), {
      type: 'png',
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
    }),
  ]);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: [pageW, pageH], margin: 0 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header band
    doc.save();
    doc.rect(0, 0, pageW, 52).fill(black);
    if (logoPath) {
      try {
        doc.image(logoPath, margin, 8, { height: 22 });
      } catch {
        doc.fillColor(orange).fontSize(11).font('Helvetica-Bold').text('Structbay', margin, 14);
      }
    } else {
      doc.fillColor(orange).fontSize(11).font('Helvetica-Bold').text('Structbay', margin, 14);
    }
    doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold')
      .text('Order Fulfillment Label', pageW - margin - 100, 12, { width: 100, align: 'right' });
    doc.font('Helvetica').fontSize(6.5)
      .text(`Order # ${data.orderNumber}`, pageW - margin - 100, 24, { width: 100, align: 'right' })
      .text(`Shipment # ${data.shipmentId}`, pageW - margin - 100, 32, { width: 100, align: 'right' })
      .text(`Tracking # ${data.trackingNumber}`, pageW - margin - 100, 40, { width: 100, align: 'right' });
    doc.restore();

    let y = 58;

    // Barcode + QR row — barcode encodes tracking #; QR encodes full label JSON
    try {
      doc.image(barcodePng, margin, y, { width: pageW - margin * 2 - 56, height: 36 });
    } catch (err) {
      throw new Error(`Failed to render shipping barcode: ${err.message}`);
    }
    try {
      doc.image(qrPng, pageW - margin - 48, y, { width: 48, height: 48 });
      doc.fillColor(gray).fontSize(5.5).font('Helvetica')
        .text('Scan for details', pageW - margin - 48, y + 50, { width: 48, align: 'center' });
    } catch (err) {
      throw new Error(`Failed to render shipping QR code: ${err.message}`);
    }
    y += 58;
    line(doc, y, margin, pageW);
    y += 8;

    const section = (title, lines) => {
      doc.fillColor(black).fontSize(7).font('Helvetica-Bold').text(title, margin, y);
      y += 10;
      doc.fillColor(gray).fontSize(7).font('Helvetica');
      for (const ln of lines) {
        doc.text(ln, margin, y, { width: pageW - margin * 2 });
        y += 9;
      }
      y += 4;
    };

    section('SHIP TO', [
      data.shipTo.name || '—',
      data.shipTo.phone ? `Ph: ${data.shipTo.phone}` : null,
      data.shipTo.address,
      [data.shipTo.city, data.shipTo.state, data.shipTo.pincode].filter(Boolean).join(', '),
    ].filter(Boolean));

    line(doc, y, margin, pageW);
    y += 6;

    section('SHIP FROM', [
      data.shipFrom.name || '—',
      data.shipFrom.phone ? `Ph: ${data.shipFrom.phone}` : null,
      data.shipFrom.address,
      data.shipFrom.gst ? `GST: ${data.shipFrom.gst}` : null,
    ].filter(Boolean));

    line(doc, y, margin, pageW);
    y += 6;

    section('PRODUCT DETAILS', data.products.map((p) => {
      const variantPart = p.variationLabel ? ` — ${p.variationLabel}` : '';
      const skuPart = p.sku ? ` (${p.sku})` : '';
      return `${p.name}${variantPart}${skuPart} · Qty ${p.quantity}${p.weight ? ` · ${p.weight}` : ''}`;
    }));

    if (data.packageCount || data.totalWeight) {
      doc.fillColor(gray).fontSize(7).font('Helvetica')
        .text(`Packages: ${data.packageCount || 1}${data.totalWeight ? ` · Total weight: ${data.totalWeight}` : ''}`, margin, y);
      y += 12;
    }

    if (data.logistics && (data.logistics.partner || data.logistics.driver)) {
      line(doc, y, margin, pageW);
      y += 6;
      section('LOGISTICS', [
        data.logistics.partner ? `Courier: ${data.logistics.partner}` : null,
        data.logistics.pickupWindow ? `Pickup: ${data.logistics.pickupWindow}` : null,
        data.logistics.estimatedDelivery ? `Est. delivery: ${data.logistics.estimatedDelivery}` : null,
        data.logistics.driver ? `Driver: ${data.logistics.driver}` : null,
        data.logistics.driverContact ? `Contact: ${data.logistics.driverContact}` : null,
      ].filter(Boolean));
    }

    // Footer
    const footerY = pageH - 36;
    line(doc, footerY, margin, pageW, '#dddddd');
    doc.fillColor(black).fontSize(7).font('Helvetica-Bold')
      .text('HANDLE WITH CARE', margin, footerY + 6, { width: pageW - margin * 2, align: 'center' });
    doc.fillColor(gray).fontSize(6).font('Helvetica')
      .text('Structbay Marketplace · support@structbay.com · www.structbay.com', margin, footerY + 16, {
        width: pageW - margin * 2,
        align: 'center',
      });

    doc.end();
  });
}

module.exports = { buildShippingLabelPdf };
