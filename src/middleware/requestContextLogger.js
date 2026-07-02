const logger = require('../logger/logger');

const requestContextLogger = (req, res, next) => {
  const startedAt = Date.now();

  logger.info(
    {
      method: req.method,
      path: req.originalUrl,
      userAgent: req.get('user-agent') || null,
      ip: req.ip
    },
    'Request received'
  );

  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        memoryUsage: process.memoryUsage().rss
      },
      'Response sent'
    );
  });

  next();
};

module.exports = requestContextLogger;
