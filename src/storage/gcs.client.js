const { getStorageClient, getBucket, validateStorageConfig, ensureBucketAccessible } = require('./storageClient');

module.exports = {
  getStorageClient,
  getBucket,
  validateStorageConfig,
  ensureBucketAccessible
};
