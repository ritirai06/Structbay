const VendorDocument = require('../models/VendorDocument');
const VendorActivityLog = require('../models/VendorActivityLog');
const ApiResponse = require('../utils/apiResponse');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get All Vendor Documents
// @route   GET /api/v1/vendor/documents
exports.getDocuments = async (req, res) => {
  const { type } = req.query;
  const query = { vendor: req.user._id };
  if (type) query.documentType = type;

  const docs = await VendorDocument.find(query).sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Documents retrieved.', docs);
};

// @desc    Upload Vendor Document
// @route   POST /api/v1/vendor/documents
exports.uploadDocument = async (req, res) => {
  if (!req.file) return ApiResponse.badRequest(res, 'No document uploaded.');

  const { documentType, documentName, documentNumber, issueDate, expiryDate, notes } = req.body;

  if (!documentType) return ApiResponse.badRequest(res, 'documentType is required.');

  const doc = await VendorDocument.create({
    vendor: req.user._id,
    documentType,
    documentName: documentName || req.file.originalname,
    documentUrl: req.file.path,
    cloudinaryId: req.file.filename,
    documentNumber,
    issueDate,
    expiryDate,
    notes,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    uploadedBy: req.user._id,
  });

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'document_upload',
    description: `Uploaded ${documentType}: ${doc.documentName}`,
    relatedDocument: doc._id,
    ipAddress: req.ip,
  });

  return ApiResponse.created(res, 'Document uploaded successfully.', doc);
};

// @desc    Delete Vendor Document
// @route   DELETE /api/v1/vendor/documents/:id
exports.deleteDocument = async (req, res) => {
  const doc = await VendorDocument.findOne({ _id: req.params.id, vendor: req.user._id });
  if (!doc) return ApiResponse.notFound(res, 'Document not found.');

  if (doc.cloudinaryId) {
    await cloudinary.uploader.destroy(doc.cloudinaryId, { resource_type: 'raw' }).catch(() => {});
  }

  await VendorDocument.deleteOne({ _id: doc._id });

  await VendorActivityLog.create({
    vendor: req.user._id,
    action: 'document_delete',
    description: `Deleted document: ${doc.documentName}`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Document deleted.');
};
