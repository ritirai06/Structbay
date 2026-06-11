const ApiResponse = require('../utils/apiResponse');

/**
 * After multer + Cloudinary pipeline, `req.file` has `path` (URL) and `filename` (public_id).
 */
function imageUploadResult(req, res) {
  if (!req.file?.path) {
    return ApiResponse.badRequest(res, 'Image file is required (form field name: image).');
  }
  return ApiResponse.success(res, 200, 'File uploaded.', {
    url: req.file.path,
    publicId: req.file.filename,
  });
}

module.exports = { imageUploadResult };
