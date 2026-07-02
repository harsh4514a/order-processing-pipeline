const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const config = require('../config/env');
const logger = require('../logger/logger');
const AppError = require('../utils/appError');
const { getBucket } = require('../storage/storageClient');
const { validateMimeType } = require('../utils/fileTypeValidator');
const { sanitizeFileName, sanitizeObjectPath } = require('../utils/fileNameSanitizer');
const { mapGcsError } = require('../utils/gcsErrorMapper');

class StorageService {
  generateUniqueFilename(originalName) {
    const safeName = sanitizeFileName(originalName);
    const extension = path.extname(safeName) || '.csv';
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

    return `orders-${timestamp}-${randomUUID()}${extension}`;
  }

  async fileExists(fileName) {
    const safeFileName = sanitizeFileName(fileName);
    const objectPath = sanitizeObjectPath(`${config.gcs.uploadFolder}/${safeFileName}`);

    try {
      const bucket = await getBucket();
      const file = bucket.file(objectPath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      throw mapGcsError(error, 'Failed to check file existence in GCS');
    }
  }

  getPublicUrl(fileName) {
    const safeFileName = sanitizeFileName(fileName);
    const objectPath = sanitizeObjectPath(`${config.gcs.uploadFolder}/${safeFileName}`);

    return `https://storage.googleapis.com/${encodeURIComponent(config.gcs.bucketName)}/${encodeURI(objectPath)}`;
  }

  async uploadBuffer(buffer, filename, options = {}) {
    const startedAt = Date.now();
    const contentType = options.contentType || 'text/csv';
    validateMimeType(contentType);

    const generatedFileName = this.generateUniqueFilename(filename);
    const objectPath = sanitizeObjectPath(`${config.gcs.uploadFolder}/${generatedFileName}`);

    try {
      const bucket = await getBucket();
      const file = bucket.file(objectPath);

      logger.info(
        {
          bucket: config.gcs.bucketName,
          generatedFilename: generatedFileName,
          fileSize: buffer.length,
          contentType
        },
        'GCS upload started'
      );

      await file.save(buffer, {
        contentType,
        resumable: true,
        validation: 'crc32c',
        ifGenerationMatch: 0,
        metadata: {
          cacheControl: 'no-store'
        }
      });

      const [metadata] = await file.getMetadata();
      const durationMs = Date.now() - startedAt;

      logger.info(
        {
          bucket: config.gcs.bucketName,
          generatedFilename: generatedFileName,
          objectPath,
          fileSize: Number(metadata.size || buffer.length),
          durationMs
        },
        'GCS upload completed'
      );

      return {
        fileName: generatedFileName,
        bucket: config.gcs.bucketName,
        objectPath,
        generation: metadata.generation,
        size: Number(metadata.size || buffer.length),
        contentType: metadata.contentType || contentType,
        uploadedAt: metadata.timeCreated || new Date().toISOString()
      };
    } catch (error) {
      logger.error(
        {
          bucket: config.gcs.bucketName,
          generatedFilename: generatedFileName,
          error: error.message,
          durationMs: Date.now() - startedAt
        },
        'GCS upload failed'
      );
      throw mapGcsError(error, 'Failed to upload buffer to GCS');
    }
  }

  async uploadFile(localFilePath, options = {}) {
    const absoluteFilePath = path.resolve(localFilePath);
    const safeFileName = sanitizeFileName(path.basename(absoluteFilePath));

    let stats;
    try {
      stats = await fs.stat(absoluteFilePath);
    } catch (error) {
      const appError = new AppError('Local file could not be read for upload', 400, {
        path: absoluteFilePath,
        reason: error.message
      });
      appError.code = 'LOCAL_FILE_NOT_FOUND';
      throw appError;
    }

    if (!stats.isFile()) {
      const appError = new AppError('Provided local path is not a file', 400, {
        path: absoluteFilePath
      });
      appError.code = 'INVALID_LOCAL_FILE';
      throw appError;
    }

    const contentType = options.contentType || 'text/csv';
    validateMimeType(contentType);

    const generatedFileName = this.generateUniqueFilename(safeFileName);
    const objectPath = sanitizeObjectPath(`${config.gcs.uploadFolder}/${generatedFileName}`);
    const startedAt = Date.now();

    try {
      const bucket = await getBucket();

      logger.info(
        {
          bucket: config.gcs.bucketName,
          generatedFilename: generatedFileName,
          fileSize: stats.size,
          contentType
        },
        'GCS upload started'
      );

      await bucket.upload(absoluteFilePath, {
        destination: objectPath,
        resumable: true,
        ifGenerationMatch: 0,
        metadata: {
          contentType,
          cacheControl: 'no-store'
        }
      });

      const file = bucket.file(objectPath);
      const [metadata] = await file.getMetadata();

      logger.info(
        {
          bucket: config.gcs.bucketName,
          generatedFilename: generatedFileName,
          objectPath,
          fileSize: Number(metadata.size || stats.size),
          durationMs: Date.now() - startedAt
        },
        'GCS upload completed'
      );

      return {
        fileName: generatedFileName,
        bucket: config.gcs.bucketName,
        objectPath,
        generation: metadata.generation,
        size: Number(metadata.size || stats.size),
        contentType: metadata.contentType || contentType,
        uploadedAt: metadata.timeCreated || new Date().toISOString()
      };
    } catch (error) {
      logger.error(
        {
          bucket: config.gcs.bucketName,
          generatedFilename: generatedFileName,
          error: error.message,
          durationMs: Date.now() - startedAt
        },
        'GCS upload failed'
      );
      throw mapGcsError(error, 'Failed to upload file to GCS');
    }
  }

  async deleteFile(fileName) {
    const safeFileName = sanitizeFileName(fileName);
    const objectPath = sanitizeObjectPath(`${config.gcs.uploadFolder}/${safeFileName}`);

    try {
      const bucket = await getBucket();
      const file = bucket.file(objectPath);
      await file.delete({ ignoreNotFound: true });

      return {
        deleted: true,
        bucket: config.gcs.bucketName,
        objectPath
      };
    } catch (error) {
      throw mapGcsError(error, 'Failed to delete file from GCS');
    }
  }
}

module.exports = new StorageService();
module.exports.StorageService = StorageService;
