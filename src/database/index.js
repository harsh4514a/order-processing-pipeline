const { testDatabaseConnection, closePool, pool, getAllPools, getPoolByShardId } = require('./postgres');
const { runMigrations } = require('./migrationRunner');
const { getDatabaseHealth } = require('./healthChecker');
const { testAllShardConnections } = require('./connectionTester');

const initializeDatabaseConnections = async () => {
  await testDatabaseConnection();
};

const closeDatabaseConnections = async () => {
  await closePool();
};

module.exports = {
  pool,
  getAllPools,
  getPoolByShardId,
  initializeDatabaseConnections,
  closeDatabaseConnections,
  runMigrations,
  getDatabaseHealth,
  testAllShardConnections
};
