const AppError = require('./appError');

const mapGcsError = (error, contextMessage) => {
  const message = contextMessage || 'Google Cloud Storage operation failed';

  if (error.code === 401) {
    const mapped = new AppError('GCS authentication failed while using ADC', 500, { reason: error.message });
    mapped.code = 'GCS_AUTHENTICATION_FAILURE';
    return mapped;
  }

  if (error.code === 403) {
    const mapped = new AppError('GCS permission denied for requested operation', 500, { reason: error.message });
    mapped.code = 'GCS_PERMISSION_DENIED';
    return mapped;
  }

  if (error.code === 404) {
    const mapped = new AppError('GCS bucket or object not found', 404, { reason: error.message });
    mapped.code = 'GCS_NOT_FOUND';
    return mapped;
  }

  if (error.code === 'ETIMEDOUT' || error.code === 408) {
    const mapped = new AppError('GCS request timed out', 504, { reason: error.message });
    mapped.code = 'GCS_TIMEOUT';
    return mapped;
  }

  const fallback = new AppError(message, 500, { reason: error.message });
  fallback.code = 'GCS_OPERATION_FAILURE';
  return fallback;
};

module.exports = {
  mapGcsError
};
