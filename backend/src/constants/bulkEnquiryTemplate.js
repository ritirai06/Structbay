/** Sample rows for customer bulk-enquiry template downloads (PRD: Product — Quantity). */
const BULK_ENQUIRY_TEMPLATE_COLUMNS = [
  'Product',
  'Brand',
  'Grade / Specification',
  'Quantity',
  'Unit',
  'Delivery timeline',
  'Remarks',
];

const BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS = [
  {
    product: 'Ultratech Cement OPC 53 Grade',
    brand: 'Ultratech',
    specification: '53 Grade OPC',
    quantity: 500,
    unit: 'bags',
    timeline: 'Within 7 days',
    remarks: 'Site: Tower A footing',
  },
  {
    product: 'Asian Paints Apex Ultima',
    brand: 'Asian Paints',
    specification: 'Interior emulsion',
    quantity: 120,
    unit: 'buckets',
    timeline: 'Within 10 days',
    remarks: '',
  },
  {
    product: 'TMT Steel Bar',
    brand: 'Tata Tiscon',
    specification: 'Fe 500D · 12 mm',
    quantity: 8,
    unit: 'MT',
    timeline: 'Phase 1 — urgent',
    remarks: 'Cut & bend as per drawing',
  },
  {
    product: 'River Sand',
    brand: '—',
    specification: 'M-sand alternative acceptable',
    quantity: 45,
    unit: 'MT',
    timeline: 'Rolling monthly',
    remarks: '',
  },
];

/** Plain-text example for the requirement textarea. */
const BULK_ENQUIRY_TEXT_EXAMPLE = BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS.map(
  (r) => `${r.product} — ${r.quantity} ${r.unit}`
).join('\n');

module.exports = {
  BULK_ENQUIRY_TEMPLATE_COLUMNS,
  BULK_ENQUIRY_TEMPLATE_SAMPLE_ROWS,
  BULK_ENQUIRY_TEXT_EXAMPLE,
};
