const mongoose = require('mongoose');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ''));
}

function toApiDoc(doc) {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') return doc.toObject();
  return doc;
}

module.exports = {
  isValidId,
  toApiDoc,
};
