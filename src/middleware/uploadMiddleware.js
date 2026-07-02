const multer = require('multer');
const path = require('path');
const config = require('../config/env');
const AppError = require('../utils/appError');
const { validateMimeType } = require('../utils/fileTypeValidator');
const { sanitizeFileName } = require('../utils/fileNameSanitizer');

const MAX_UPLOAD_SIZE_BYTES = config.upload.maxFileSizeMb * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx']);

const storage = multer.diskStorage({
  destination: config.upload.directory,
  filename: (req, file, cb) => {
    try {
      const safeName = sanitizeFileName(file.originalname);
      cb(null, safeName);
    } catch (error) {
      cb(error);
    }
  }
});

const fileFilter = (req, file, cb) => {
  try {
    const extension = path.extname(String(file.originalname || '')).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      const error = new AppError('Unsupported file extension. Only CSV and XLSX are allowed.', 400, {
        extension
      });
      error.code = 'UNSUPPORTED_FILE_EXTENSION';
      cb(error);
      return;
    }

    validateMimeType(file.mimetype);
    cb(null, true);
  } catch (error) {
    cb(error);
  }
};

const uploadOrdersSingle = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
    files: 1
  },
  fileFilter
}).single('file');

const uploadMiddleware = (req, res, next) => {
  uploadOrdersSingle(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const appError = new AppError('Uploaded file exceeds 50 MB limit', 413);
        appError.code = 'FILE_TOO_LARGE';
        return next(appError);
      }

      return next(error);
    }

    if (!req.file) {
      const appError = new AppError('Exactly one file is required', 400);
      appError.code = 'FILE_REQUIRED';
      return next(appError);
    }

    if (req.file.size === 0) {
      const appError = new AppError('Uploaded file is empty', 400);
      appError.code = 'EMPTY_FILE';
      return next(appError);
    }

    return next();
  });
};

module.exports = {
  uploadMiddleware,
  MAX_UPLOAD_SIZE_BYTES
};
