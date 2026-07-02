const AppError = require('../utils/appError');
const config = require('./env');

const validateEnv = async () => {
  const failures = [];

  if (!config.gcs.bucketName) {
    failures.push('GCS_BUCKET_NAME is required');
  }

  if (!config.database.shardUrls[1] || !config.database.shardUrls[2] || !config.database.shardUrls[3]) {
    failures.push('DATABASE_URL_SHARD1, DATABASE_URL_SHARD2, DATABASE_URL_SHARD3 are required');
  }

  if (config.database.defaultBatchSize <= 0) {
    failures.push('BATCH_INSERT_SIZE must be greater than 0');
  }

  if (config.app.port <= 0 || config.app.port > 65535) {
    failures.push('PORT must be between 1 and 65535');
  }

  if (failures.length > 0) {
    const error = new AppError('Environment validation failed', 500, { failures });
    error.code = 'ENV_VALIDATION_ERROR';
    throw error;
  }
};

module.exports = {
  validateEnv
};
