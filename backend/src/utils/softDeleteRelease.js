const slugify = require('slugify');
const { USER_STATUS } = require('../config/constants');

function deletedSuffix(id) {
  return `__deleted__${String(id)}`;
}

/**
 * Mutate unique fields on a document before soft delete so the same values can be reused.
 * Sets isDeleted = true on the document.
 */
function applySoftDelete(doc, options = {}) {
  const {
    fields = [],
    id = doc._id,
    nameMaxLength = 200,
  } = options;
  const tag = deletedSuffix(id);

  for (const field of fields) {
    const val = doc[field];
    if (val == null || String(val).trim() === '') continue;

    if (field === 'email') {
      doc.email = `deleted+${tag}+${String(val).toLowerCase()}`.slice(0, 320);
      continue;
    }
    if (field === 'sku') {
      doc.sku = `${String(val)}${tag}`.slice(0, 120).toUpperCase();
      continue;
    }
    if (field === 'name') {
      doc.name = `${String(val)} (deleted)`.slice(0, nameMaxLength);
      continue;
    }
    if (field === 'slug') {
      doc.slug = `${String(val)}${tag}`.slice(0, 120);
    }
  }

  doc.isDeleted = true;

  // Release slug from name when slug field was not explicitly set
  if (fields.includes('name') && !fields.includes('slug') && doc.name) {
    const baseSlug = doc.name.replace(/\s*\(deleted\)\s*$/i, '').trim();
    doc.slug = `${slugify(baseSlug, { lower: true, strict: true })}${tag}`.slice(0, 120);
  }
}

function applyUserSoftDelete(user) {
  const tag = deletedSuffix(user._id);
  user.email = `deleted+${tag}+${String(user.email).toLowerCase()}`.slice(0, 320);
  user.status = USER_STATUS.DELETED;
}

/**
 * Find and revive a soft-deleted row (bypasses Mongoose find hooks).
 */
async function reviveSoftDeleted(Model, filter, setOnRevive = {}) {
  const raw = await Model.collection.findOne({ ...filter, isDeleted: true });
  if (!raw) return null;
  await Model.collection.updateOne(
    { _id: raw._id },
    { $set: { ...setOnRevive, isDeleted: false } }
  );
  return Model.findById(raw._id);
}

module.exports = {
  applySoftDelete,
  applyUserSoftDelete,
  reviveSoftDeleted,
  deletedSuffix,
};
