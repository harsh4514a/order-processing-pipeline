const healthRepository = require('../repositories/health.repository');
const { checkGCSConnection } = require('../utils/checkGCSConnection');

const getSystemHealth = async () => {
  const dbStatus = await healthRepository.getDatabaseStatus();
  const gcsStatus = await checkGCSConnection();

  const memory = process.memoryUsage();
  const appHealthy = dbStatus.connected && gcsStatus.healthy;

  return {
    status: appHealthy ? 'ok' : 'degraded',
    application: {
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      nodeVersion: process.version
    },
    database: dbStatus,
    gcs: gcsStatus,
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  getSystemHealth
};
