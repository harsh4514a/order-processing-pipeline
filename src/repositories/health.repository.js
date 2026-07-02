const { pool } = require('../database');
const { getDatabaseHealth } = require('../database/healthChecker');

const getDatabaseStatus = async () => {
  const result = await pool.query('SELECT NOW() as now');
  const shardHealth = await getDatabaseHealth();

  return {
    connected: true,
    now: result.rows[0].now,
    shards: shardHealth
  };
};

module.exports = {
  getDatabaseStatus
};
