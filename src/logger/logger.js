const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const config = require('../config/env');

const logDirectory = path.resolve(process.cwd(), config.logging.directory);

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logger = createLogger({
  level: config.logging.level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: config.app.name },
  transports: [
    new transports.File({ filename: path.join(logDirectory, 'combined.log') }),
    new transports.File({ filename: path.join(logDirectory, 'upload.log') }),
    new transports.File({ filename: path.join(logDirectory, 'database.log') }),
    new transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' })
  ]
});

if (config.app.env !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  );
}

module.exports = logger;
