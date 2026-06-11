const slugify = require('slugify');
const Category = require('../models/Category');
const AppError = require('./AppError');

function escRx(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugToTitle(slug) {
  return String(slug)
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function isObjectIdString(s) {
  return typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s.trim());
}

/**
 * Resolve a CSV / JSON row to a Category _id.
 * @param {object} r - Row with categoryId, categorySlug, and/or categoryName
 * @param {{ autoCreate?: boolean, userId?: import('mongoose').Types.ObjectId|null, stats?: { categoriesCreated?: number } }} opts
 * @returns {Promise<import('mongoose').Types.ObjectId>}
 */
async function resolveCategoryFromRow(r, opts = {}) {
  const autoCreate = Boolean(opts.autoCreate);
  const userId = opts.userId || null;
  const stats = opts.stats;

  const rawId = String(r.categoryId || r.category_id || '').trim();
  const rawSlug = String(r.categorySlug || r.category_slug || '').trim();
  const rawName = String(r.categoryName || r.category_name || '').trim();

  if (isObjectIdString(rawId)) {
    const c = await Category.findById(rawId).select('_id').lean();
    if (!c) throw new AppError('Category not found.', 404);
    return c._id;
  }

  const normalizedSlug = rawSlug
    ? rawSlug.toLowerCase().trim()
    : rawName
      ? slugify(rawName, { lower: true, strict: true })
      : '';

  const lookupName = rawName.trim();
  const createName = lookupName || (normalizedSlug ? slugToTitle(normalizedSlug) : '');

  if (!createName && !normalizedSlug) {
    throw new AppError('categoryId, categorySlug, or categoryName is required.', 400);
  }

  let c = null;
  if (normalizedSlug) {
    c = await Category.findOne({ slug: normalizedSlug }).select('_id').lean();
  }
  if (!c && lookupName) {
    c = await Category.findOne({ name: new RegExp(`^${escRx(lookupName)}$`, 'i') }).select('_id').lean();
  }

  if (c) return c._id;

  if (!autoCreate) {
    const hint = rawSlug || normalizedSlug || lookupName || '—';
    throw new AppError(`Category slug not found: ${hint}`, 404);
  }

  if (!createName) {
    throw new AppError(`Cannot derive category name for slug: ${normalizedSlug}`, 400);
  }

  try {
    const created = await Category.create({
      name: createName,
      description: null,
      sortOrder: 0,
      status: 'ACTIVE',
      createdBy: userId || undefined,
    });

    if (normalizedSlug && created.slug !== normalizedSlug) {
      const clash = await Category.findOne({ slug: normalizedSlug, _id: { $ne: created._id } })
        .select('_id')
        .lean();
      if (!clash) {
        await Category.updateOne({ _id: created._id }, { $set: { slug: normalizedSlug } });
      }
    }

    if (stats && typeof stats === 'object') {
      stats.categoriesCreated = (stats.categoriesCreated || 0) + 1;
    }
    return created._id;
  } catch (e) {
    if (e?.code === 11000) {
      const again =
        (normalizedSlug && (await Category.findOne({ slug: normalizedSlug }).select('_id').lean())) ||
        (await Category.findOne({ name: new RegExp(`^${escRx(createName)}$`, 'i') }).select('_id').lean());
      if (again) return again._id;
    }
    throw e;
  }
}

module.exports = { resolveCategoryFromRow, escRx };
