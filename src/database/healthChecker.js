const { getAllPools } = require('./connectionManager');

const getDatabaseHealth = async () => {
  const checks = await Promise.all(
    getAllPools().map(async ({ shardId, shardName, pool }) => {
      const startTime = Date.now();
      try {
        const result = await pool.query('SELECT NOW() AS current_time');
        return {
          shardId,
          shardName,
          healthy: true,
          latencyMs: Date.now() - startTime,
          currentTime: result.rows[0].current_time
        };
      } catch (error) {
        return {
          shardId,
          shardName,
          healthy: false,
          latencyMs: Date.now() - startTime,
          error: error.message
        };
      }
    })
  );

  return {
    healthy: checks.every((entry) => entry.healthy),
    shards: checks,
    checkedAt: new Date().toISOString()
  };
};

module.exports = {
  getDatabaseHealth
};
