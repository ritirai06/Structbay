const multer = require('multer');
const streamifier = require('streamifier');
const { cloudinary } = require('../config/cloudinary');
const ApiResponse = require('../utils/apiResponse');
const {
  UPLOAD_FOLDERS,
  FILE_SIZE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
} = require('../config/constants');

const trimEnv = (v) => (typeof v === 'string' ? v.trim() : v || '');

/**
 * Custom Multer storage engine that streams files directly to Cloudinary v2.
 * Bypasses disk storage entirely — memory → stream → Cloudinary.
 */
const buildCloudinaryStorage = (folder, resourceType = 'auto') => ({
  _handleFile(req, file, cb) {
    const cn = trimEnv(process.env.CLOUDINARY_CLOUD_NAME);
    const ck = trimEnv(process.env.CLOUDINARY_API_KEY);
    const cs = trimEnv(process.env.CLOUDINARY_API_SECRET);
    if (!cn || !ck || !cs) {
      return cb(
        new Error(
          'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, use_filename: true, unique_filename: true },
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          fieldname:  file.fieldname,
          originalname: file.originalname,
          mimetype:   file.mimetype,
          path:       result.secure_url,    // public URL
          filename:   result.public_id,     // Cloudinary public_id
          size:       result.bytes,
        });
      }
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  },
  _removeFile(req, file, cb) { cb(null); },
});

/**
 * Create a Multer middleware configured for Cloudinary v2.
 * Files are first buffered in memory (memoryStorage), then streamed to Cloudinary.
 */
const createUploader = (folder, allowedTypes, maxSize, resourceType = 'auto') => {
  // Step 1: buffer file in memory
  const memUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) return cb(null, true);
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
    },
  });

  // Step 2: stream buffer to Cloudinary
  const cloudStorage = buildCloudinaryStorage(folder, resourceType);

  return {
    single: (fieldName) => [
      memUpload.single(fieldName),
      (req, res, next) => {
        if (!req.file) return next();
        cloudStorage._handleFile(req, req.file, (err, info) => {
          if (err) return next(err);
          req.file = { ...req.file, ...info };
          next();
        });
      },
    ],
    array: (fieldName, maxCount) => [
      memUpload.array(fieldName, maxCount),
      (req, res, next) => {
        if (!req.files || !req.files.length) return next();
        let completed = 0;
        const results = [];
        for (const file of req.files) {
          cloudStorage._handleFile(req, file, (err, info) => {
            if (err) return next(err);
            results.push({ ...file, ...info });
            if (++completed === req.files.length) {
              req.files = results;
              next();
            }
          });
        }
      },
    ],
    /** e.g. [{ name: 'packing', maxCount: 5 }, { name: 'invoice', maxCount: 1 }] */
    fields: (fieldDefs) => [
      memUpload.fields(fieldDefs),
      (req, res, next) => {
        if (!req.files || typeof req.files !== 'object') return next();
        const grouped = req.files;
        const flat = [];
        Object.keys(grouped).forEach((k) => {
          (grouped[k] || []).forEach((f) => flat.push({ ...f, _field: k }));
        });
        if (!flat.length) return next();
        let completed = 0;
        const byField = {};
        for (const file of flat) {
          cloudStorage._handleFile(req, file, (err, info) => {
            if (err) return next(err);
            const field = file._field;
            const merged = { ...file, ...info };
            if (!byField[field]) byField[field] = [];
            byField[field].push(merged);
            if (++completed === flat.length) {
              req.files = byField;
              next();
            }
          });
        }
      },
    ],
  };
};

// ─── Pre-configured uploaders ─────────────────────────────────────────────────

const uploadImage = (folder = UPLOAD_FOLDERS.BANNER) =>
  createUploader(folder, ALLOWED_IMAGE_TYPES, FILE_SIZE_LIMITS.IMAGE, 'image');

const uploadDocument = (folder = UPLOAD_FOLDERS.CUSTOMER_DOCS) =>
  createUploader(folder, [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES], FILE_SIZE_LIMITS.DOCUMENT, 'auto');

/** Multipart fields → Cloudinary (e.g. packing[] + invoice). */
const uploadDocumentFields = (folder, fieldDefs) =>
  createUploader(folder, [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES], FILE_SIZE_LIMITS.DOCUMENT, 'auto').fields(fieldDefs);

// ─── Multer error handler ─────────────────────────────────────────────────────

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return ApiResponse.badRequest(res, 'File too large. Maximum allowed size exceeded.');
    return ApiResponse.badRequest(res, `Upload error: ${err.message}`);
  }
  if (err && err.message) return ApiResponse.badRequest(res, err.message);
  next(err);
};

module.exports = { uploadImage, uploadDocument, uploadDocumentFields, handleUploadError, createUploader };
