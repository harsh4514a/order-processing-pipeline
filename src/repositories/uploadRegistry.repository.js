const { getPoolByShardId } = require('../database/connectionManager');
const logger = require('../logger/logger');
const { mapPostgresErrorToAppError } = require('../utils/databaseError');

class UploadRegistryRepository {
  constructor() {
    this.pool = getPoolByShardId(1);
  }

  async existsByFingerprint(fileFingerprint) {
    try {
      const result = await this.pool.query({
        name: 'upload_registry_exists_by_fingerprint',
        text: 'SELECT 1 FROM upload_registry WHERE file_fingerprint = $1 LIMIT 1',
        values: [fileFingerprint]
      });

      return result.rowCount > 0;
    } catch (error) {
      logger.error({ error, fileFingerprint }, 'Failed to query upload registry fingerprint');
      throw mapPostgresErrorToAppError(error, 'Unable to query upload registry');
    }
  }

  async createEntry({ fileFingerprint, originalFileName, uploadedFileName, bucketName }) {
    try {
      await this.pool.query({
        name: 'upload_registry_insert_entry',
        text: `
          INSERT INTO upload_registry (file_fingerprint, original_file_name, uploaded_file_name, bucket_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (file_fingerprint) DO NOTHING
        `,
        values: [fileFingerprint, originalFileName, uploadedFileName, bucketName]
      });
    } catch (error) {
      logger.error({ error, fileFingerprint }, 'Failed to insert upload registry entry');
      throw mapPostgresErrorToAppError(error, 'Unable to persist upload registry entry');
    }
  }
}

module.exports = new UploadRegistryRepository();
module.exports.UploadRegistryRepository = UploadRegistryRepository;
