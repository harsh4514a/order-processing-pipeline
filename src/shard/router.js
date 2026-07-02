const crypto = require('crypto');
const config = require('../config/env');
const { getPoolByShardId } = require('../database/connectionManager');

const normalizeCustomerId = (customerId) => {
  if (customerId === undefined || customerId === null || customerId === '') {
    const error = new Error('customer_id is required for shard routing');
    error.code = 'SHARD_KEY_REQUIRED';
    throw error;
  }

  return String(customerId);
};

const hashCustomerId = (customerId) => {
  const normalizedCustomerId = normalizeCustomerId(customerId);
  const digest = crypto.createHash('sha256').update(normalizedCustomerId).digest();

  // Using the first 32-bit segment gives a deterministic integer for modulo routing.
  return digest.readUInt32BE(0);
};

const getShardId = (customerId) => {
  const hash = hashCustomerId(customerId);

  // Application-level sharding strategy: hash(customer_id) % totalShards + 1
  return (hash % config.database.totalShards) + 1;
};

const getShard = (customerId) => {
  const shardId = getShardId(customerId);
  const pool = getPoolByShardId(shardId);

  return {
    shardId,
    pool
  };
};

module.exports = {
  hashCustomerId,
  getShardId,
  getShard
};
