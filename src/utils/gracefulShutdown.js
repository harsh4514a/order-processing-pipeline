const { closeDatabaseConnections } = require('../database');
const logger = require('../logger/logger');
const { closeTrackedResources } = require('./resourceTracker');

const registerGracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      await closeDatabaseConnections();
      await closeTrackedResources();
      logger.info('HTTP server closed gracefully');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      logger.error({ error }, 'Failed during SIGINT shutdown');
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      logger.error({ error }, 'Failed during SIGTERM shutdown');
      process.exit(1);
    });
  });
};

module.exports = registerGracefulShutdown;
