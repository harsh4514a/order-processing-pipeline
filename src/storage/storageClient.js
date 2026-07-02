const { Storage } = require('@google-cloud/storage');
const config = require('../config/env');
const logger = require('../logger/logger');
const AppError = require('../utils/appError');

let singletonStorageClient = null;
let singletonBucket = null;

const validateStorageConfig = async () => {
  if (!config.gcs.bucketName) {
    const error = new AppError('GCS_BUCKET_NAME is required for storage operations', 500);
    error.code = 'GCS_CONFIG_ERROR';
    throw error;
  }
};

const createStorageClient = async () => {
  await validateStorageConfig();

  // ADC is resolved by the Google Cloud SDK automatically from the runtime environment.
  const storage = new Storage({
    retryOptions: {
      autoRetry: true,
      maxRetries: 3
    },
    timeout: config.gcs.requestTimeoutMs
  });

  return storage;
};

const getStorageClient = async () => {
  if (!singletonStorageClient) {
    singletonStorageClient = await createStorageClient();
    logger.info({ bucket: config.gcs.bucketName }, 'Google Cloud Storage client initialized with ADC');
  }

  return singletonStorageClient;
};

const getBucket = async () => {
  if (!singletonBucket) {
    const client = await getStorageClient();
    singletonBucket = client.bucket(config.gcs.bucketName);
  }

  return singletonBucket;
};

const ensureBucketAccessible = async () => {
  try {
    const bucket = await getBucket();
    const [exists] = await bucket.exists();

    if (!exists) {
      const error = new AppError('Configured GCS bucket was not found', 500, {
        bucket: config.gcs.bucketName
      });
      error.code = 'GCS_BUCKET_NOT_FOUND';
      throw error;
    }

    return true;
  } catch (error) {
    if (error.code === 401 || error.code === 403) {
      const authError = new AppError('GCS authentication or permission error while validating bucket', 500, {
        bucket: config.gcs.bucketName,
        reason: error.message
      });
      authError.code = 'GCS_AUTH_PERMISSION_ERROR';
      throw authError;
    }

    if (error.code === 'GCS_BUCKET_NOT_FOUND') {
      throw error;
    }

    const wrappedError = new AppError('Failed to access configured GCS bucket', 500, {
      bucket: config.gcs.bucketName,
      reason: error.message
    });
    wrappedError.code = 'GCS_BUCKET_ACCESS_ERROR';
    throw wrappedError;
  }
};

module.exports = {
  getStorageClient,
  getBucket,
  validateStorageConfig,
  ensureBucketAccessible
};
