const path = require('path');
const AppError = require('./appError');

const sanitizeFileName = (fileName) => {
  const safeBaseName = path.basename(String(fileName || ''));

  if (!safeBaseName || safeBaseName === '.' || safeBaseName === '..') {
    const error = new AppError('Invalid file name', 400, { fileName });
    error.code = 'INVALID_FILE_NAME';
    throw error;
  }

  if (safeBaseName.includes('/') || safeBaseName.includes('\\')) {
    const error = new AppError('Path traversal attempt detected', 400, { fileName });
    error.code = 'PATH_TRAVERSAL_DETECTED';
    throw error;
  }

  const cleaned = safeBaseName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

  if (!cleaned) {
    const error = new AppError('Sanitized file name is empty', 400, { fileName });
    error.code = 'INVALID_FILE_NAME';
    throw error;
  }

  return cleaned;
};

const sanitizeObjectPath = (objectPath) => {
  const normalized = String(objectPath || '').replace(/\\/g, '/');

  if (normalized.includes('..')) {
    const error = new AppError('Path traversal sequence is not allowed', 400, { objectPath });
    error.code = 'PATH_TRAVERSAL_DETECTED';
    throw error;
  }

  return normalized.replace(/\/+/g, '/').replace(/^\/+/, '');
};

module.exports = {
  sanitizeFileName,
  sanitizeObjectPath
};
