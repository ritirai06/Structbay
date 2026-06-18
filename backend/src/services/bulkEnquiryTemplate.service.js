const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const {
  BULK_ENQUIRY_TEMPLATE_COLUMNS,
  BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS,
} = require('../constants/bulkEnquiryTemplate');

const ORANGE = '#E85A00';
const BLACK = '#000000';
const GRAY = '#666666';

function getStructBayLogoPath() {
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

function rowToArray(row) {
  return [
    row.product,
    row.brand,
    row.specification,
    row.quantity,
    row.unit,
    row.timeline,
    row.remarks,
  ];
}

async function buildBulkEnquiryExcelBuffer() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'StructBay';
  wb.created = new Date();

  const ws = wb.addWorksheet('Bulk Requirements', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const colCount = BULK_ENQUIRY_TEMPLATE_COLUMNS.length;
  const lastCol = String.fromCharCode(64 + colCount);

  ws.mergeCells(`A1:${lastCol}1`);
  const title = ws.getCell('A1');
  title.value = 'StructBay — Bulk order requirement template';
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 28;

  ws.mergeCells(`A2:${lastCol}2`);
  const note = ws.getCell('A2');
  note.value =
    'Fill product lines below (or add your own). Upload this file with your bulk enquiry, or copy into the requirement text box. One of text or document is required.';
  note.font = { size: 10, color: { argb: 'FF444444' } };
  note.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(2).height = 36;

  ws.getRow(3).height = 6;

  const headerRow = ws.getRow(4);
  BULK_ENQUIRY_TEMPLATE_COLUMNS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE85A00' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  headerRow.height = 22;

  const widths = [34, 16, 22, 12, 10, 18, 28];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let r = 5;
  for (const sample of BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS) {
    const dataRow = ws.getRow(r);
    rowToArray(sample).forEach((val, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = val;
      cell.font = { size: 10 };
      cell.alignment = { vertical: 'top', wrapText: true };
      if (i === 3) cell.numFmt = '#,##0';
    });
    r += 1;
  }

  for (let i = 0; i < 6; i += 1) {
    const blank = ws.getRow(r);
    BULK_ENQUIRY_TEMPLATE_COLUMNS.forEach((_, col) => {
      blank.getCell(col + 1).border = {
        bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
      };
    });
    r += 1;
  }

  return wb.xlsx.writeBuffer();
}

function buildBulkEnquiryPdfBuffer() {
  const logoPath = getStructBayLogoPath();

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentW = doc.page.width - 96;
    let y = 48;

    if (logoPath) {
      try {
        doc.image(logoPath, 48, y, { width: 120 });
        y += 44;
      } catch {
        /* logo optional */
      }
    }

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(18).text('Bulk order requirement template', 48, y);
    y = doc.y + 6;
    doc.fillColor(GRAY).font('Helvetica').fontSize(10).text(
      'List materials as Product — Quantity. Fill the table below, then upload with your enquiry or paste into the requirement box.',
      48,
      y,
      { width: contentW }
    );
    y = doc.y + 16;

    doc.rect(48, y, contentW, 3).fill(ORANGE);
    y += 14;

    const colWidths = [130, 70, 90, 55, 45, contentW - 130 - 70 - 90 - 55 - 45];
    const headers = ['Product', 'Brand', 'Grade/Spec', 'Qty', 'Unit', 'Remarks'];
    const rowH = 22;
    const headerH = 24;

    doc.rect(48, y, contentW, headerH).fill(BLACK);
    let x = 48;
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    headers.forEach((h, i) => {
      doc.text(h, x + 4, y + 7, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });
    y += headerH;

    const allRows = [
      ...BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS,
      { product: '', brand: '', specification: '', quantity: '', unit: '', timeline: '', remarks: '' },
      { product: '', brand: '', specification: '', quantity: '', unit: '', timeline: '', remarks: '' },
      { product: '', brand: '', specification: '', quantity: '', unit: '', timeline: '', remarks: '' },
    ];

    allRows.forEach((row, idx) => {
      const isSample = idx < BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS.length;
      const bg = isSample ? '#FAFAFA' : '#FFFFFF';
      doc.rect(48, y, contentW, rowH).fill(bg);
      doc.rect(48, y, contentW, rowH).stroke('#E5E5E5');

      x = 48;
      const cells = [
        row.product,
        row.brand,
        row.specification,
        row.quantity != null ? String(row.quantity) : '',
        row.unit,
        row.remarks || row.timeline || '',
      ];
      doc.fillColor(BLACK).font(isSample ? 'Helvetica' : 'Helvetica-Oblique').fontSize(8);
      cells.forEach((text, i) => {
        doc.text(String(text || (isSample ? '' : '—')), x + 4, y + 6, {
          width: colWidths[i] - 8,
          height: rowH - 8,
          ellipsis: true,
        });
        x += colWidths[i];
      });
      y += rowH;
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 48;
      }
    });

    y += 12;
    doc.fillColor(GRAY).font('Helvetica').fontSize(9).text(
      'Tip: You may also type requirements as plain text, e.g. "Ultratech Cement — 500 bags" (one product per line). StructBay responds within 4 business hours.',
      48,
      y,
      { width: contentW }
    );

    doc.end();
  });
}

module.exports = {
  buildBulkEnquiryExcelBuffer,
  buildBulkEnquiryPdfBuffer,
};
