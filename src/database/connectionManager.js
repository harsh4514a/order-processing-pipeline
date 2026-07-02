const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../logger/logger');

const SHARD_DEFINITIONS = [
  { id: 1, name: 'shard1', connectionString: config.database.shardUrls[1] },
  { id: 2, name: 'shard2', connectionString: config.database.shardUrls[2] },
  { id: 3, name: 'shard3', connectionString: config.database.shardUrls[3] }
];

const pools = new Map();

const createPool = (shardDefinition) => {
  const pool = new Pool({
    connectionString: shardDefinition.connectionString,
    max: config.postgres.maxPool,
    idleTimeoutMillis: config.postgres.idleTimeoutMs,
    connectionTimeoutMillis: config.postgres.connectionTimeoutMs,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (error) => {
    logger.error({ error, shard: shardDefinition.name }, 'Unexpected PostgreSQL idle client error');
  });

  return pool;
};

for (const shardDefinition of SHARD_DEFINITIONS) {
  pools.set(shardDefinition.id, createPool(shardDefinition));
}

const getShardDefinitionById = (shardId) => {
  const normalizedShardId = Number(shardId);
  return SHARD_DEFINITIONS.find((entry) => entry.id === normalizedShardId) || null;
};

const getPoolByShardId = (shardId) => {
  const normalizedShardId = Number(shardId);
  const pool = pools.get(normalizedShardId);

  if (!pool) {
    const error = new Error(`Pool not found for shard ${normalizedShardId}`);
    error.code = 'POOL_NOT_FOUND';
    throw error;
  }

  return pool;
};

const getAllPools = () => SHARD_DEFINITIONS.map((definition) => ({
  shardId: definition.id,
  shardName: definition.name,
  pool: pools.get(definition.id)
}));

const closeAllPools = async () => {
  const closeOperations = getAllPools().map(async ({ shardId, shardName, pool }) => {
    await pool.end();
    logger.info({ shardId, shardName }, 'PostgreSQL pool closed');
  });

  await Promise.all(closeOperations);
};

module.exports = {
  SHARD_DEFINITIONS,
  getShardDefinitionById,
  getPoolByShardId,
  getAllPools,
  closeAllPools
};
