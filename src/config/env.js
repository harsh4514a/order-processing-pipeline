const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildPostgresUrl = ({ host, port, database, user, password }) => {
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
};

const defaultPostgres = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: toNumber(process.env.POSTGRES_PORT, 5432),
  database: process.env.POSTGRES_DB || 'orders',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
};

const defaultShardUrl = buildPostgresUrl(defaultPostgres);

const config = {
  app: {
    name: process.env.APP_NAME || 'order-app',
    env: process.env.NODE_ENV || 'development',
    port: toNumber(process.env.PORT, 3000),
    basePath: process.env.APP_BASE_PATH || '/api/v1',
    trustProxy: toBoolean(process.env.TRUST_PROXY, false)
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || 'logs'
  },
  postgres: {
    host: defaultPostgres.host,
    port: defaultPostgres.port,
    database: defaultPostgres.database,
    user: defaultPostgres.user,
    password: defaultPostgres.password,
    ssl: toBoolean(process.env.POSTGRES_SSL, false),
    maxPool: toNumber(process.env.POSTGRES_MAX_POOL, 20),
    idleTimeoutMs: toNumber(process.env.POSTGRES_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMs: toNumber(process.env.POSTGRES_CONNECTION_TIMEOUT_MS, 5000)
  },
  database: {
    totalShards: toNumber(process.env.TOTAL_SHARDS, 3),
    defaultBatchSize: toNumber(process.env.BATCH_INSERT_SIZE, 500),
    shardUrls: {
      1: process.env.DATABASE_URL_SHARD1 || defaultShardUrl,
      2: process.env.DATABASE_URL_SHARD2 || process.env.DATABASE_URL_SHARD1 || defaultShardUrl,
      3: process.env.DATABASE_URL_SHARD3 || process.env.DATABASE_URL_SHARD1 || defaultShardUrl
    }
  },
  gcs: {
    bucketName: process.env.GCS_BUCKET_NAME || '',
    uploadFolder: process.env.GCS_UPLOAD_FOLDER || 'orders',
    requestTimeoutMs: toNumber(process.env.GCS_REQUEST_TIMEOUT_MS, 30000),
    enforceAdc: toBoolean(process.env.GCS_ENFORCE_ADC, true)
  },
  upload: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: toNumber(process.env.MAX_FILE_SIZE_MB, 50)
  }
};

module.exports = config;
