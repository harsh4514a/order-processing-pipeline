const fs = require('fs/promises');
const path = require('path');
const logger = require('../logger/logger');
const { getAllPools, closeAllPools } = require('./connectionManager');

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const getAppliedMigrationSet = async (client) => {
  const result = await client.query('SELECT filename FROM schema_migrations;');
  return new Set(result.rows.map((row) => row.filename));
};

const loadMigrationFiles = async () => {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  return entries.filter((entry) => entry.endsWith('.sql')).sort();
};

const runMigrationsForShard = async ({ shardId, shardName, pool }) => {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrationSet(client);
    const migrationFiles = await loadMigrationFiles();

    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        continue;
      }

      const migrationPath = path.join(MIGRATIONS_DIR, filename);
      const migrationSql = await fs.readFile(migrationPath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(migrationSql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        logger.info({ shardId, shardName, filename }, 'Migration applied');
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ error, shardId, shardName, filename }, 'Migration failed and was rolled back');
        throw error;
      }
    }
  } finally {
    client.release();
  }
};

const runMigrations = async () => {
  const pools = getAllPools();

  for (const shardPool of pools) {
    await runMigrationsForShard(shardPool);
  }

  logger.info('All shard migrations completed successfully');
};

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closeAllPools();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error({ error }, 'Migration runner failed');
      await closeAllPools();
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  runMigrationsForShard,
  loadMigrationFiles,
  ensureMigrationsTable
};
