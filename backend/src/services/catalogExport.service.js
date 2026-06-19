const Product = require('../models/Product');
const { isValidId } = require('../lib/apiShape');
const ProductVariation = require('../models/ProductVariation');
const VendorVariantPricing = require('../models/VendorVariantPricing');

const MAX_ROWS = 2500;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsvCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function storefrontOrigin() {
  const u = (process.env.CUSTOMER_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return u;
}

function productPublicUrl(slug) {
  if (!slug) return '';
  return `${storefrontOrigin()}/products/${encodeURIComponent(slug)}`;
}

function formatVariantAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') return '';
  const parts = [];
  ['weight', 'grade', 'size', 'color', 'finish', 'diameter'].forEach((k) => {
    if (attrs[k]) parts.push(`${k}: ${attrs[k]}`);
  });
  (attrs.custom || []).forEach((c) => {
    if (c?.key && c?.value) parts.push(`${c.key}: ${c.value}`);
    else if (c?.value) parts.push(String(c.value));
  });
  return parts.join(' | ');
}

function badgeSummary(p) {
  const bits = [];
  if (p.isStructbayAssured || p.isAssured) bits.push('StructBay Assured');
  if (p.isStructbayDelivery || p.isExpress) bits.push('StructBay Delivery');
  if (p.isTopSelling) bits.push('Top Selling');
  if (p.isFeatured) bits.push('Featured');
  return bits.join('; ');
}

/**
 * @returns {Promise<{ products: any[], truncated: boolean }>}
 */
async function resolveProductsForScope({ scope, productId, categoryId, brandId, vendorUserId, productIds }) {
  const base = { status: 'ACTIVE' };
  let truncated = false;

  if (scope === 'PRODUCT') {
    if (!isValidId(productId)) return { products: [], truncated: false };
    const p = await Product.findOne({ _id: productId, ...base })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .lean();
    return { products: p ? [p] : [], truncated: false };
  }

  if (scope === 'CATEGORY') {
    if (!isValidId(categoryId)) return { products: [], truncated: false };
    const q = { ...base, category: categoryId };
    const total = await Product.countDocuments(q);
    const list = await Product.find(q)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ displayOrder: 1, name: 1 })
      .limit(MAX_ROWS)
      .lean();
    truncated = total > MAX_ROWS;
    return { products: list, truncated };
  }

  if (scope === 'BRAND') {
    if (!isValidId(brandId)) return { products: [], truncated: false };
    const q = { ...base, brand: brandId };
    const total = await Product.countDocuments(q);
    const list = await Product.find(q)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ displayOrder: 1, name: 1 })
      .limit(MAX_ROWS)
      .lean();
    truncated = total > MAX_ROWS;
    return { products: list, truncated };
  }

  if (scope === 'VENDOR') {
    if (!isValidId(vendorUserId)) return { products: [], truncated: false };
    const vps = await VendorVariantPricing.find({ vendorUser: vendorUserId, isActive: true })
      .select('variant')
      .lean();
    const variantIds = [...new Set(vps.map((x) => String(x.variant)).filter(Boolean))];
    if (!variantIds.length) return { products: [], truncated: false };
    const vars = await ProductVariation.find({ _id: { $in: variantIds } }).select('product').lean();
    const productIdSet = [...new Set(vars.map((v) => String(v.product)))];
    const total = productIdSet.length;
    const slice = productIdSet.slice(0, MAX_ROWS);
    truncated = total > MAX_ROWS;
    const list = await Product.find({ _id: { $in: slice }, ...base })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ name: 1 })
      .lean();
    return { products: list, truncated };
  }

  if (scope === 'CUSTOM') {
    const ids = (productIds || []).filter((id) => isValidId(id)).slice(0, MAX_ROWS);
    truncated = (productIds || []).length > MAX_ROWS;
    if (!ids.length) return { products: [], truncated };
    const list = await Product.find({ _id: { $in: ids }, ...base })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .lean();
    return { products: list, truncated };
  }

  return { products: [], truncated: false };
}

async function loadVariationsByProductIds(productIds) {
  if (!productIds.length) return new Map();
  const vars = await ProductVariation.find({
    product: { $in: productIds },
    status: 'ACTIVE',
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  const map = new Map();
  vars.forEach((v) => {
    const k = String(v.product);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  });
  return map;
}

function buildFlatRows(products, varMap) {
  const rows = [];
  const origin = storefrontOrigin();

  for (const p of products) {
    const pid = String(p._id);
    const vars = varMap.get(pid) || [];
    const cat = p.category?.name || '';
    const brand = p.brand?.name || '';
    const badges = badgeSummary(p);
    const url = productPublicUrl(p.slug);

    if (!vars.length) {
      rows.push({
        productName: p.name,
        productSku: p.sku,
        brand,
        category: cat,
        variantSku: '',
        variantAttributes: '',
        variantMrp: '',
        variantMoq: '',
        variantLeadDays: '',
        gstPercent: p.gstPercentage ?? '',
        badges,
        productUrl: url,
        storefrontOrigin: origin,
      });
    } else {
      for (const v of vars) {
        rows.push({
          productName: p.name,
          productSku: p.sku,
          brand,
          category: cat,
          variantSku: v.sku || '',
          variantAttributes: formatVariantAttributes(v.attributes),
          variantMrp: v.mrp != null ? String(v.mrp) : '',
          variantMoq: v.moq != null ? String(v.moq) : '',
          variantLeadDays: v.leadTimeDays != null ? String(v.leadTimeDays) : '',
          gstPercent: p.gstPercentage ?? '',
          badges,
          productUrl: url,
          storefrontOrigin: origin,
        });
      }
    }
  }
  return rows;
}

const CSV_HEADER = [
  'Product Name',
  'Product SKU',
  'Brand',
  'Category',
  'Variant SKU',
  'Variant Attributes',
  'Variant MRP',
  'Variant MOQ',
  'Variant Lead Time (days)',
  'GST %',
  'Badges',
  'Product URL',
];

function rowsToCsv(rows) {
  const lines = [CSV_HEADER.map(escapeCsvCell).join(',')];
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
        r.variantMoq,
        r.variantLeadDays,
        r.gstPercent,
        r.badges,
        r.productUrl,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

function rowsToHtml(title, rows) {
  const safeTitle = escapeHtml(title);
  const date = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const rowsHtml = rows
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.productName)}</td>
  <td>${escapeHtml(r.productSku)}</td>
  <td>${escapeHtml(r.brand)}</td>
  <td>${escapeHtml(r.category)}</td>
  <td>${escapeHtml(r.variantSku)}</td>
  <td>${escapeHtml(r.variantAttributes)}</td>
  <td>${escapeHtml(r.variantMrp)}</td>
  <td>${escapeHtml(r.variantMoq)}</td>
  <td>${escapeHtml(r.variantLeadDays)}</td>
  <td>${escapeHtml(r.gstPercent)}</td>
  <td>${escapeHtml(r.badges)}</td>
  <td><a href="${escapeHtml(r.productUrl)}">${escapeHtml(r.productUrl)}</a></td>
</tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} — StructBay</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 0; color: #111; background: #faf8f5; }
    .cover { background: linear-gradient(120deg, #0f172a 0%, #1e293b 40%, #431407 100%); color: #fff; padding: 2rem 1.5rem; }
    .cover h1 { margin: 0 0 0.5rem; font-size: 1.75rem; }
    .cover .brand { color: #FE5E00; font-weight: 700; letter-spacing: 0.02em; }
    .cover .meta { opacity: 0.85; font-size: 0.9rem; }
    .wrap { padding: 1rem; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; min-width: 960px; background: #fff; font-size: 0.8rem; }
    th, td { border: 1px solid #e5e7eb; padding: 0.45rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #fff7ed; font-weight: 600; }
    tr:nth-child(even) td { background: #fafafa; }
    a { color: #c2410c; }
    @media print { body { background: #fff; } .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <div class="brand">StructBay</div>
    <h1>${safeTitle}</h1>
    <div class="meta">Generated ${escapeHtml(date)} · ${rows.length} line(s)</div>
  </div>
  <div class="wrap">
    <table>
      <thead><tr>
        ${CSV_HEADER.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
      </tr></thead>
      <tbody>
${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/**
 * @param {object} opts
 * @param {'PRODUCT'|'CATEGORY'|'BRAND'|'VENDOR'|'CUSTOM'} opts.scope
 * @param {'csv'|'html'} opts.format
 */
async function buildExport(opts) {
  const { products, truncated } = await resolveProductsForScope(opts);
  const ids = products.map((p) => p._id);
  const varMap = await loadVariationsByProductIds(ids);
  const rows = buildFlatRows(products, varMap);

  let title = 'Product catalog';
  if (opts.scope === 'PRODUCT' && products[0]) title = products[0].name;
  else if (opts.scope === 'CATEGORY' && products[0]?.category?.name) title = `${products[0].category.name} catalog`;
  else if (opts.scope === 'BRAND' && products[0]?.brand?.name) title = `${products[0].brand.name} catalog`;
  else if (opts.scope === 'VENDOR') title = 'Vendor catalog';
  else if (opts.scope === 'CUSTOM') title = 'Custom product catalog';

  const format = opts.format === 'html' ? 'html' : 'csv';
  const body = format === 'html' ? rowsToHtml(title, rows) : rowsToCsv(rows);
  const ext = format === 'html' ? 'html' : 'csv';
  const filename = `structbay-catalog-${String(opts.scope).toLowerCase()}-${Date.now()}.${ext}`;

  return { body, filename, mime: format === 'html' ? 'text/html; charset=utf-8' : 'text/csv; charset=utf-8', rowCount: rows.length, truncated, title };
}

module.exports = {
  buildExport,
  resolveProductsForScope,
  MAX_ROWS,
};
