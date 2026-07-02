const logger = require('../logger/logger');
const { getAllPools } = require('./connectionManager');

const testPoolConnection = async ({ shardId, shardName, pool }) => {
  const start = Date.now();
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    return {
      shardId,
      shardName,
      connected: true,
      latencyMs: Date.now() - start
    };
  } finally {
    client.release();
  }
};

const testAllShardConnections = async () => {
  const pools = getAllPools();

  const results = await Promise.all(
    pools.map(async (entry) => {
      try {
        return await testPoolConnection(entry);
      } catch (error) {
        logger.error({ error, shardId: entry.shardId, shardName: entry.shardName }, 'Database connection test failed');
        return {
          shardId: entry.shardId,
          shardName: entry.shardName,
          connected: false,
          error: error.message
        };
      }
    })
  );

  const hasFailure = results.some((result) => !result.connected);
  if (hasFailure) {
    const failureError = new Error('One or more shard connections failed');
    failureError.code = 'DATABASE_CONNECTION_FAILURE';
    failureError.details = results;
    throw failureError;
  }

  return results;
};

module.exports = {
  testPoolConnection,
  testAllShardConnections
};
