const { INTERNAL_SERVER_ERROR } = require('../constants/httpStatus');
const { INTERNAL_ERROR } = require('../constants/messages');
const { buildErrorResponse } = require('../utils/apiResponse');
const logger = require('../logger/logger');

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || INTERNAL_SERVER_ERROR;
  const message = error.isOperational ? error.message : INTERNAL_ERROR;

  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method
  }, 'Unhandled application error');

  // Never expose raw internal details to clients.
  // Only return safe operational details if explicitly provided.
  const safeDetails = error.isOperational ? (error.details ?? null) : null;

  res.status(statusCode).json(
    buildErrorResponse({
      message,
      code: error.code || 'INTERNAL_ERROR',
      details: safeDetails
    })
  );
};

module.exports = errorHandler;
