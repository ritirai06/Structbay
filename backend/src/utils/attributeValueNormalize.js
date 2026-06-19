/**
 * Canonical attribute values for filters, variant matching, and display.
 * Prevents duplicates like "10kg", "10 KG", "10 kg" from appearing as separate options.
 */

/** @param {unknown} value */
function collapseWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * @param {unknown} value
 * @param {string} [key] attribute key (size, weight, etc.)
 * @returns {string}
 */
function canonicalAttributeValue(value, key = '') {
  let s = collapseWhitespace(value);
  if (!s) return '';

  const k = String(key).toLowerCase();
  const numericUnit = s.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?$/);
  if (numericUnit) {
    const num = numericUnit[1];
    let unit = (numericUnit[2] || '').toUpperCase();
    if (!unit && (k === 'weight' || k === 'size')) unit = 'KG';
    if (unit === 'KGS') unit = 'KG';
    if (unit) return `${num} ${unit}`;
    return num;
  }

  return s;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} [key]
 */
function attributeValuesEquivalent(a, b, key = '') {
  const ca = canonicalAttributeValue(a, key).toLowerCase();
  const cb = canonicalAttributeValue(b, key).toLowerCase();
  return ca.length > 0 && ca === cb;
}

/**
 * Dedupe string values using canonical form; keeps first seen display label.
 * @param {string[]} values
 * @param {string} [key]
 * @returns {string[]}
 */
function dedupeAttributeValues(values, key = '') {
  const seen = new Map();
  for (const raw of values) {
    const display = collapseWhitespace(raw);
    if (!display) continue;
    const canon = canonicalAttributeValue(display, key).toLowerCase();
    if (!seen.has(canon)) {
      seen.set(canon, canonicalAttributeValue(display, key));
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

module.exports = {
  collapseWhitespace,
  canonicalAttributeValue,
  attributeValuesEquivalent,
  dedupeAttributeValues,
};
