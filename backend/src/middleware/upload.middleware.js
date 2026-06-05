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

/**
 * Custom Multer storage engine that streams files directly to Cloudinary v2.
 * Bypasses disk storage entirely — memory → stream → Cloudinary.
 */
const buildCloudinaryStorage = (folder, resourceType = 'auto') => ({
  _handleFile(req, file, cb) {
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
  };
};

// ─── Pre-configured uploaders ─────────────────────────────────────────────────

const uploadImage = (folder = UPLOAD_FOLDERS.BANNER) =>
  createUploader(folder, ALLOWED_IMAGE_TYPES, FILE_SIZE_LIMITS.IMAGE, 'image');

const uploadDocument = (folder = UPLOAD_FOLDERS.CUSTOMER_DOCS) =>
  createUploader(folder, [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES], FILE_SIZE_LIMITS.DOCUMENT, 'auto');

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

module.exports = { uploadImage, uploadDocument, handleUploadError, createUploader };
