jest.mock('pg', () => {
  const connect = jest.fn(async () => ({
    query: jest.fn(async () => ({ rows: [] })),
    release: jest.fn()
  }));

  const Pool = jest.fn(() => ({
    connect,
    end: jest.fn(async () => undefined),
    on: jest.fn(),
    query: jest.fn(async () => ({ rows: [{ now: new Date().toISOString() }] }))
  }));

  return { Pool };
});

describe('Database connection manager', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL_SHARD1 = 'postgresql://postgres:postgres@localhost:5432/orders_shard1';
    process.env.DATABASE_URL_SHARD2 = 'postgresql://postgres:postgres@localhost:5432/orders_shard2';
    process.env.DATABASE_URL_SHARD3 = 'postgresql://postgres:postgres@localhost:5432/orders_shard3';
  });

  test('builds one pool per shard', () => {
    const { Pool } = require('pg');
    const { getAllPools } = require('../src/database/connectionManager');

    expect(Pool).toHaveBeenCalledTimes(3);
    expect(getAllPools()).toHaveLength(3);
  });

  test('tests all shard connections', async () => {
    const { testAllShardConnections } = require('../src/database/connectionTester');

    await expect(testAllShardConnections()).resolves.toHaveLength(3);
  });
});
