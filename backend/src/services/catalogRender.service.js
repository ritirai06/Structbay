const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const QRCode = require('qrcode');
const axios = require('axios');
const { normalizeWholesaleSlabsForResolve } = require('./checkoutPricing.service');

const storefrontOrigin = () =>
  (process.env.CUSTOMER_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const productUrl = (slug) => (slug ? `${storefrontOrigin()}/product/${encodeURIComponent(slug)}` : '');

function formatWholesaleTiersForCatalog(pr) {
  if (!pr) return '';
  const slabs = normalizeWholesaleSlabsForResolve(pr.wholesaleSlabs);
  if (!slabs.length) return '';
  const base = pr.salePrice ?? pr.regularPrice;
  const bits = [`Base: ₹${base}`];
  for (const s of slabs) {
    const maxLabel = s.maxQty == null ? '+' : `–${s.maxQty}`;
    bits.push(`${s.minQty}${maxLabel} u: ₹${s.price}`);
  }
  return bits.join(' · ');
}

const MAX_PDF_PRODUCTS = 60;

async function fetchImageBuffer(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000, maxContentLength: 6 * 1024 * 1024 });
    return Buffer.from(r.data);
  } catch {
    return null;
  }
}

function escapeCsvCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function badgeLine(p) {
  const bits = [];
  if (p.isStructbayAssured || p.isAssured) bits.push('Structbay Assured');
  if (p.isStructbayDelivery || p.isExpress) bits.push('Structbay Delivery');
  if (p.isTopSelling) bits.push('Top Selling');
  if (p.isFeatured) bits.push('Featured');
  return bits.join(' · ');
}

function formatAttrs(attrs) {
  if (!attrs) return '';
  const parts = [];
  ['weight', 'grade', 'size', 'color', 'finish', 'diameter'].forEach((k) => {
    if (attrs[k]) parts.push(`${k}: ${attrs[k]}`);
  });
  (attrs.custom || []).forEach((c) => {
    if (c?.key && c?.value) parts.push(`${c.key}: ${c.value}`);
  });
  return parts.join(' | ');
}

/** Flat rows for CSV/HTML — one row per variant (or one for no variants). */
function flatRowsFromBundles(bundles, includePricing) {
  const rows = [];
  for (const b of bundles) {
    const p = b.product;
    const cat = p.category?.name || '';
    const brand = p.brand?.name || '';
    const badges = badgeLine(p);
    const url = productUrl(p.slug);
    const vars = b.variations?.length ? b.variations : [null];
    for (const v of vars) {
      const attrs = v ? formatAttrs(v.attributes) : '';
      const sku = v?.sku || '';
      const mrp = v?.mrp != null ? String(v.mrp) : '';
      const moq = v?.moq != null ? String(v.moq) : '';
      const lead = v?.leadTimeDays != null ? String(v.leadTimeDays) : '';
      let sell = '';
      let wholesaleText = '';
      if (includePricing && b.pricingFor) {
        const pr = b.pricingFor(v);
        if (pr) {
          sell = String(pr.salePrice ?? pr.regularPrice ?? '');
          wholesaleText = formatWholesaleTiersForCatalog(pr);
        }
      }
      rows.push({
        productName: p.name,
        productSku: p.sku,
        brand,
        category: cat,
        variantSku: sku,
        variantAttributes: attrs,
        variantMrp: mrp,
        sellingPrice: sell,
        wholesaleTiers: wholesaleText,
        variantMoq: moq,
        variantLeadDays: lead,
        gstPercent: p.gstPercentage ?? '',
        badges,
        productUrl: url,
        shortDescription: (p.shortDescription || '').slice(0, 400),
        description: (p.description || '').replace(/<[^>]+>/g, ' ').slice(0, 800),
      });
    }
  }
  return rows;
}

async function renderPdfBuffer({ bundles, catalogName, coverMeta, options }) {
  const bundlesLimited = bundles.slice(0, MAX_PDF_PRODUCTS);
  const pdfTruncated = bundles.length > MAX_PDF_PRODUCTS;
  const includePricing = options.includePricing !== false;
  const includeQr = options.includeQrCodes !== false;
  const includeDocs = options.includeDocuments !== false;

  const chunks = [];
  const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
  doc.on('data', (c) => chunks.push(c));

  const coverQr = await QRCode.toDataURL(storefrontOrigin(), { type: 'png', margin: 1, width: 160 });

  doc.rect(0, 0, doc.page.width, 120).fill('#0f172a');
  if (options.coverImageUrl && /^https?:\/\//i.test(String(options.coverImageUrl))) {
    const cib = await fetchImageBuffer(String(options.coverImageUrl));
    if (cib) {
      try {
        doc.image(cib, doc.page.width - 188, 18, { width: 140, height: 84, fit: [140, 84] });
      } catch {
        /* ignore */
      }
    }
  }
  doc.fillColor('#FE5E00').fontSize(14).text('Structbay', 48, 36);
  doc.fillColor('#ffffff').fontSize(20).text(catalogName || 'Product Catalog', 48, 58, { width: doc.page.width - 220 });
  doc.fontSize(10).fillColor('#e2e8f0').text('Construction Materials Marketplace', 48, 88);
  doc.fillColor('#111').fontSize(10);
  let y = 140;
  const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  doc.text(`Generated on: ${dateStr}`, 48, y);
  y += 16;
  doc.text(`Generated by: ${coverMeta.generatedByName || 'Admin'}`, 48, y);
  y += 16;
  doc.text(`Total products: ${coverMeta.totalProducts}`, 48, y);
  y += 16;
  doc.text(`Catalog version: ${coverMeta.version || 1}`, 48, y);
  y += 16;
  if (pdfTruncated || coverMeta.truncated) {
    doc.fillColor('#b45309').text(`Note: PDF shows first ${MAX_PDF_PRODUCTS} products. Use Excel or CSV for the full list.`, 48, y, { width: doc.page.width - 96 });
    y += 32;
  }
  if (!bundlesLimited.length) {
    doc.fillColor('#b45309').fontSize(11).text(
      'No products were included in this catalog. Common reasons: (1) products are still in DRAFT — enable "Include draft products" when generating, or publish them as ACTIVE; (2) filters (category, brand, badges) excluded every row; (3) selected IDs were empty or invalid.',
      48,
      y,
      { width: doc.page.width - 96, align: 'left' }
    );
    y += 72;
  }
  try {
    const buf = Buffer.from(coverQr.split(',')[1], 'base64');
    doc.image(buf, doc.page.width - 120, 130, { width: 72, height: 72 });
  } catch {
    /* ignore */
  }

  return new Promise((resolve, reject) => {
    const onEnd = () => resolve(Buffer.concat(chunks));
    doc.once('end', onEnd);
    doc.once('error', reject);

    void (async () => {
      try {
        for (let idx = 0; idx < bundlesLimited.length; idx += 1) {
        const b = bundlesLimited[idx];
        if (idx > 0) doc.addPage();
        const p = b.product;
        doc.fontSize(16).fillColor('#0f172a').text(p.name, 48, 48, { width: doc.page.width - 96 });
        doc.fontSize(9).fillColor('#64748b').text(`${p.brand?.name || ''} · ${p.category?.name || ''} · SKU ${p.sku}`, 48, 72, { width: doc.page.width - 96 });
        doc.fontSize(9).fillColor('#334155').text(badgeLine(p) || '—', 48, 88, { width: doc.page.width - 96 });

        let imgY = 110;
        if (p.images?.[0]?.url) {
          const ib = await fetchImageBuffer(p.images[0].url);
          if (ib) {
            try {
              doc.image(ib, 48, imgY, { width: 140, height: 140, fit: [140, 140] });
            } catch {
              /* ignore */
            }
          }
        }
        const url = productUrl(p.slug);
        if (includeQr && url) {
          try {
            const qrP = await QRCode.toDataURL(url, { type: 'png', margin: 1, width: 200 });
            const qbuf = Buffer.from(qrP.split(',')[1], 'base64');
            doc.image(qbuf, doc.page.width - 140, imgY, { width: 72, height: 72 });
            doc.fontSize(7).fillColor('#64748b').text('Scan for product page', doc.page.width - 140, imgY + 78, { width: 90 });
          } catch {
            /* ignore */
          }
        }

        let ry = imgY + 150;
        doc.fontSize(10).fillColor('#111').text('Variants & logistics', 48, ry);
        ry += 18;
        doc.fontSize(8).fillColor('#0f172a');
        doc.text('Variant', 48, ry, { width: 120 });
        doc.text('MRP', 170, ry, { width: 50 });
        doc.text('MOQ', 230, ry, { width: 40 });
        doc.text('Lead', 275, ry, { width: 40 });
        if (includePricing) doc.text('Price', 325, ry, { width: 80 });
        ry += 14;
        doc.moveTo(48, ry).lineTo(doc.page.width - 48, ry).stroke('#e2e8f0');
        ry += 8;

        const varList =
          options.includeVariants === false ? [null] : b.variations?.length ? b.variations : [null];
        for (const v of varList) {
          const label = v ? formatAttrs(v.attributes) || v.sku || 'Variant' : 'Base';
          doc.fillColor('#111').fontSize(8).text(label.slice(0, 90), 48, ry, { width: 115 });
          doc.text(v && v.mrp != null ? String(v.mrp) : '—', 170, ry, { width: 50 });
          doc.text(v && v.moq != null ? String(v.moq) : '1', 230, ry, { width: 40 });
          doc.text(v && v.leadTimeDays != null ? String(v.leadTimeDays) : '—', 275, ry, { width: 40 });
          if (includePricing) {
            const pr = b.pricingFor ? b.pricingFor(v) : null;
            doc.text(pr ? `₹${pr.salePrice ?? pr.regularPrice ?? ''}` : '—', 325, ry, { width: 80 });
          }
          ry += 20;
          if (ry > doc.page.height - 100) {
            doc.addPage();
            ry = 48;
          }
        }

        if (p.shortDescription) {
          ry += 8;
          doc.fontSize(9).text('Short description', 48, ry);
          ry += 14;
          doc.fontSize(8).fillColor('#334155').text(String(p.shortDescription).slice(0, 500), 48, ry, { width: doc.page.width - 96 });
          ry += 40;
        }

        doc.fontSize(9).fillColor('#111').text('Specifications (database-driven)', 48, ry);
        ry += 14;
        for (const v of varList) {
          const specs = b.specificationsFor ? b.specificationsFor(v) : [];
          for (const row of specs.slice(0, 15)) {
            doc.fontSize(7).fillColor('#475569').text(`${row.label}: ${row.value}`.slice(0, 130), 48, ry, { width: doc.page.width - 96 });
            ry += 12;
            if (ry > doc.page.height - 60) {
              doc.addPage();
              ry = 48;
            }
          }
        }

        if (includeDocs && b.documents?.length) {
          ry += 8;
          doc.fontSize(9).text('Documents', 48, ry);
          ry += 14;
          b.documents.slice(0, 8).forEach((d) => {
            doc.fontSize(7).fillColor('#2563eb').text(`• ${d.name || 'File'}: ${d.url}`, 48, ry, { link: d.url, underline: true, width: doc.page.width - 96 });
            ry += 12;
          });
        }

        if (options.includeVendorInfo) {
          ry += 10;
          doc.fontSize(8).fillColor('#475569').text(
            'Vendor assignment, verified GST profiles, ratings, and lead times are shown to buyers in checkout and RFQs on Structbay.',
            48,
            ry,
            { width: doc.page.width - 96 }
          );
        }
        }

        doc.end();
      } catch (e) {
        doc.removeListener('end', onEnd);
        reject(e);
      }
    })();
  });
}

async function renderXlsxBuffer({ bundles, catalogName, coverMeta, options }) {
  const includePricing = options.includePricing !== false;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Structbay';
  wb.created = new Date();
  const ws = wb.addWorksheet('Catalog', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Product', key: 'product', width: 32 },
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Variant SKU', key: 'vsku', width: 14 },
    { header: 'Variant attributes', key: 'attrs', width: 40 },
    { header: 'MRP', key: 'mrp', width: 10 },
    { header: 'Selling price', key: 'price', width: 12 },
    { header: 'Wholesale tiers (ex-GST)', key: 'wholesale', width: 42 },
    { header: 'MOQ', key: 'moq', width: 8 },
    { header: 'Lead days', key: 'lead', width: 10 },
    { header: 'GST %', key: 'gst', width: 8 },
    { header: 'Badges', key: 'badges', width: 28 },
    { header: 'Product URL', key: 'url', width: 42 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const b of bundles) {
    const p = b.product;
    const vars = options.includeVariants === false ? [null] : b.variations?.length ? b.variations : [null];
    for (const v of vars) {
      const pr = includePricing && b.pricingFor ? b.pricingFor(v) : null;
      const sell = pr ? pr.salePrice ?? pr.regularPrice : '';
      const wholesale = pr ? formatWholesaleTiersForCatalog(pr) : '';
      ws.addRow({
        product: p.name,
        sku: p.sku,
        brand: p.brand?.name || '',
        category: p.category?.name || '',
        vsku: v?.sku || '',
        attrs: v ? formatAttrs(v.attributes) : '',
        mrp: v?.mrp ?? '',
        price: sell,
        wholesale,
        moq: v?.moq ?? '',
        lead: v?.leadTimeDays ?? '',
        gst: p.gstPercentage ?? '',
        badges: badgeLine(p),
        url: productUrl(p.slug),
      });
    }
  }

  const meta = wb.addWorksheet('Cover');
  meta.addRow(['Structbay Product Catalog']);
  meta.addRow([catalogName || '']);
  meta.addRow([`Generated: ${new Date().toISOString()}`]);
  meta.addRow([`By: ${coverMeta.generatedByName || ''}`]);
  meta.addRow([`Products: ${coverMeta.totalProducts}`]);
  if (coverMeta.truncated) meta.addRow(['Note: list truncated at server safety limit']);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function renderCsvBuffer({ bundles, options }) {
  const rows = flatRowsFromBundles(bundles, options.includePricing !== false);
  const header = [
    'Product Name',
    'Product SKU',
    'Brand',
    'Category',
    'Variant SKU',
    'Variant Attributes',
    'MRP',
    'Selling Price',
    'Wholesale / bulk tiers (ex-GST)',
    'MOQ',
    'Lead Time (days)',
    'GST %',
    'Badges',
    'Product URL',
    'Short Description',
  ];
  const lines = [header.map(escapeCsvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.productName,
        r.productSku,
        r.brand,
        r.category,
        r.variantSku,
        r.variantAttributes,
        r.variantMrp,
        r.sellingPrice,
        r.wholesaleTiers,
        r.variantMoq,
        r.variantLeadDays,
        r.gstPercent,
        r.badges,
        r.productUrl,
        r.shortDescription,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return Buffer.from(lines.join('\r\n'), 'utf8');
}

function renderHtmlBuffer({ bundles, catalogName, coverMeta, options }) {
  const rows = flatRowsFromBundles(bundles, options.includePricing !== false);
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const body = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.productName)}</td><td>${esc(r.productSku)}</td><td>${esc(r.brand)}</td><td>${esc(r.category)}</td><td>${esc(r.variantSku)}</td><td>${esc(r.variantAttributes)}</td><td>${esc(r.variantMrp)}</td><td>${esc(r.sellingPrice)}</td><td>${esc(r.wholesaleTiers)}</td><td>${esc(r.variantMoq)}</td><td>${esc(r.variantLeadDays)}</td><td>${esc(r.gstPercent)}</td><td>${esc(r.badges)}</td><td><a href="${esc(r.productUrl)}">${esc(r.productUrl)}</a></td></tr>`
    )
    .join('');
  return Buffer.from(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(catalogName)}</title>
<style>body{font-family:system-ui;margin:0;background:#faf8f5} .c{background:linear-gradient(120deg,#0f172a,#431407);color:#fff;padding:2rem} .o{color:#FE5E00;font-weight:700} table{border-collapse:collapse;width:100%;background:#fff;font-size:12px} th,td{border:1px solid #e5e7eb;padding:6px}</style></head><body>
<div class="c"><div class="o">Structbay</div><h1>${esc(catalogName)}</h1><p>Products: ${coverMeta.totalProducts} · ${new Date().toLocaleString('en-IN')}</p></div>
<table><thead><tr>${['Product', 'SKU', 'Brand', 'Category', 'Var SKU', 'Attributes', 'MRP', 'Price', 'Wholesale', 'MOQ', 'Lead', 'GST', 'Badges', 'URL'].map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`,
    'utf8'
  );
}

async function renderCatalogBuffer(format, ctx) {
  const f = String(format).toLowerCase();
  if (f === 'pdf') return renderPdfBuffer(ctx);
  if (f === 'xlsx') return renderXlsxBuffer(ctx);
  if (f === 'html') return renderHtmlBuffer(ctx);
  return renderCsvBuffer(ctx);
}

function extensionForFormat(format) {
  const f = String(format).toLowerCase();
  if (f === 'pdf') return 'pdf';
  if (f === 'xlsx') return 'xlsx';
  if (f === 'html') return 'html';
  return 'csv';
}

function mimeForFormat(format) {
  const f = String(format).toLowerCase();
  if (f === 'pdf') return 'application/pdf';
  if (f === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (f === 'html') return 'text/html; charset=utf-8';
  return 'text/csv; charset=utf-8';
}

module.exports = {
  renderCatalogBuffer,
  extensionForFormat,
  mimeForFormat,
  flatRowsFromBundles,
  MAX_PDF_PRODUCTS,
};
