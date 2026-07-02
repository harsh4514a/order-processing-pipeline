const AppError = require('./appError');

const mapPostgresErrorToAppError = (error, fallbackMessage) => {
  const errorMap = {
    '23505': {
      message: 'Duplicate record violates unique constraint',
      code: 'DUPLICATE_RECORD',
      statusCode: 409
    },
    '23502': {
      message: 'Required field is missing',
      code: 'NOT_NULL_VIOLATION',
      statusCode: 400
    },
    '23503': {
      message: 'Related record was not found',
      code: 'FOREIGN_KEY_VIOLATION',
      statusCode: 400
    },
    '23514': {
      message: 'Database check constraint failed',
      code: 'CHECK_VIOLATION',
      statusCode: 400
    },
    '08006': {
      message: 'Database connection failure',
      code: 'DB_CONNECTION_FAILURE',
      statusCode: 503
    }
  };

  const mapped = errorMap[error.code];

  if (mapped) {
    const appError = new AppError(mapped.message, mapped.statusCode, {
      dbCode: error.code,
      dbConstraint: error.constraint || null,
      originalMessage: error.message
    });
    appError.code = mapped.code;
    return appError;
  }

  const fallback = new AppError(fallbackMessage || 'Database operation failed', 500, {
    dbCode: error.code || null,
    dbConstraint: error.constraint || null,
    originalMessage: error.message
  });
  fallback.code = 'DATABASE_ERROR';
  return fallback;
};

module.exports = {
  mapPostgresErrorToAppError
};
