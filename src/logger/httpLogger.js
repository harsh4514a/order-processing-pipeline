const morgan = require('morgan');
const logger = require('./logger');

const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

const httpLogger = morgan('combined', { stream });

module.exports = {
  httpLogger
};
