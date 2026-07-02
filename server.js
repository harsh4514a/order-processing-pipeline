require('./src/config/env');

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const config = require('./src/config/env');
const logger = require('./src/logger/logger');
const registerGracefulShutdown = require('./src/utils/gracefulShutdown');
const { initializeDatabaseConnections } = require('./src/database');
const { validateStorageConfig, ensureBucketAccessible } = require('./src/storage/storageClient');
const { validateEnv } = require('./src/config/validateEnv');

const server = http.createServer(app);

const uploadDirectory = path.resolve(process.cwd(), config.upload.directory);
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const startServer = async () => {
  try {
    await validateEnv();
    await validateStorageConfig();
    await ensureBucketAccessible();
    await initializeDatabaseConnections();

    server.listen(config.app.port, () => {
      logger.info(
        {
          env: config.app.env,
          port: config.app.port,
          basePath: config.app.basePath
        },
        'HTTP server is running'
      );
    });

    registerGracefulShutdown(server);
  } catch (error) {
    // logger.error({ error }, 'Failed to start server');
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  }
};

startServer();
