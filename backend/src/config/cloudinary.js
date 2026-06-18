const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Upload a file to Cloudinary.
 * @param {string} filePath    - Local path or base64 data URI
 * @param {string} folder      - Cloudinary folder
 * @param {string} resourceType - 'image' | 'raw' | 'auto'
 * @returns {{ url: string, publicId: string }}
 */
const uploadFile = async (filePath, folder, resourceType = 'auto') => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  });
  logger.info(`Cloudinary upload: ${result.public_id}`);
  return { url: result.secure_url, publicId: result.public_id };
};

/**
 * Delete a file from Cloudinary.
 * @param {string} publicId
 * @param {string} resourceType
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  logger.info(`Cloudinary delete: ${publicId} — ${result.result}`);
  return result;
};

/**
 * Replace a file: delete old, upload new.
 * @returns {{ url: string, publicId: string }}
 */
const updateFile = async (oldPublicId, newFilePath, folder, resourceType = 'auto') => {
  await deleteFile(oldPublicId, resourceType);
  return uploadFile(newFilePath, folder, resourceType);
};

const uploadImage    = (filePath, folder) => uploadFile(filePath, folder, 'image');
const uploadDocument = (filePath, folder) => uploadFile(filePath, folder, 'raw');

/**
 * Upload a buffer (e.g. generated PDF) to Cloudinary.
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadBuffer = (buffer, folder, resourceType = 'raw', filename = 'file') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) return reject(error);
        logger.info(`Cloudinary buffer upload: ${result.public_id}`);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

module.exports = { cloudinary, uploadFile, uploadImage, uploadDocument, uploadBuffer, deleteFile, updateFile };
