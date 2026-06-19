const FIXED_LEGACY_KEYS = [
  'weight', 'grade', 'size', 'thickness', 'length', 'color', 'finish', 'diameter',
];
const { canonicalAttributeValue } = require('./attributeValueNormalize');

/** Normalize admin payload → flat attribute map (any keys allowed). */
function normalizeVariationAttributes(input) {
  const out = {};

  if (Array.isArray(input?.attributePairs)) {
    for (const pair of input.attributePairs) {
      const name = String(pair?.name || pair?.key || '').trim();
      const value = canonicalAttributeValue(pair?.value, name);
      if (name && value) out[name] = value;
    }
    return out;
  }

  const attrs = input?.attributes;
  if (!attrs || typeof attrs !== 'object') return out;

  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'custom' && Array.isArray(v)) {
      for (const c of v) {
        const name = String(c?.key || c?.name || '').trim();
        const value = canonicalAttributeValue(c?.value, name);
        if (name && value) out[name] = value;
      }
      continue;
    }
    if (v != null && String(v).trim()) {
      const name = String(k).trim();
      out[name] = canonicalAttributeValue(v, name);
    }
  }
  return out;
}

function flattenVariationAttributes(attrs) {
  const map = normalizeVariationAttributes({ attributes: attrs });
  return Object.entries(map).map(([key, value]) => ({ key, value }));
}

function buildSearchTextFromAttributes(attrs, extra = []) {
  const parts = [...extra].filter(Boolean).map(String);
  for (const { value, key } of flattenVariationAttributes(attrs)) {
    if (value) parts.push(value);
    if (key) parts.push(key);
  }
  return parts.join(' ').toLowerCase();
}

function getAttributeValue(attrs, key) {
  const map = normalizeVariationAttributes({ attributes: attrs });
  const lower = String(key).toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function formatVariationLabel(attrs) {
  const rows = flattenVariationAttributes(attrs);
  if (!rows.length) return '';
  return rows.map((r) => r.value).join(' · ');
}

/**
 * Mongo match: variation has attribute `key` (case-insensitive) with one of `vals`.
 * Supports flat Mixed map and legacy attributes.custom[].
 */
function buildVariationAttributeValueMatch(key, vals) {
  const { escRx } = require('./resolveCategoryFromRow');
  const keyRx = `^${escRx(String(key))}$`;
  const valueMatch = vals.length === 1
    ? { $eq: [{ $toString: '$$kv.v' }, vals[0]] }
    : { $in: [{ $toString: '$$kv.v' }, vals] };

  return {
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: {
                $concatArrays: [
                  { $objectToArray: { $ifNull: ['$attributes', {}] } },
                  {
                    $map: {
                      input: { $ifNull: ['$attributes.custom', []] },
                      as: 'c',
                      in: {
                        k: { $ifNull: ['$$c.key', '$$c.name'] },
                        v: '$$c.value',
                      },
                    },
                  },
                ],
              },
              as: 'kv',
              cond: {
                $and: [
                  { $regexMatch: { input: { $toString: '$$kv.k' }, regex: keyRx, options: 'i' } },
                  valueMatch,
                ],
              },
            },
          },
        },
        0,
      ],
    },
  };
}

module.exports = {
  FIXED_LEGACY_KEYS,
  normalizeVariationAttributes,
  flattenVariationAttributes,
  buildSearchTextFromAttributes,
  getAttributeValue,
  formatVariationLabel,
  buildVariationAttributeValueMatch,
};
