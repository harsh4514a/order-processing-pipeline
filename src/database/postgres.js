const { getPoolByShardId, closeAllPools, getAllPools } = require('./connectionManager');
const { testAllShardConnections } = require('./connectionTester');

const pool = getPoolByShardId(1);

const testDatabaseConnection = async () => {
  await testAllShardConnections();
};

const closePool = async () => {
  await closeAllPools();
};

module.exports = {
  pool,
  getAllPools,
  getPoolByShardId,
  testDatabaseConnection,
  closePool
};
