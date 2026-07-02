const AppError = require('./appError');

const SUPPORTED_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const validateMimeType = (mimeType) => {
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    const error = new AppError('Invalid file type. Only CSV and spreadsheet MIME types are allowed.', 400, {
      mimeType,
      supported: Array.from(SUPPORTED_MIME_TYPES)
    });
    error.code = 'INVALID_FILE_TYPE';
    throw error;
  }

  return true;
};

module.exports = {
  SUPPORTED_MIME_TYPES,
  validateMimeType
};
