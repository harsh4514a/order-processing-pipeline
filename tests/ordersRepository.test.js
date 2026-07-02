jest.mock('../src/shard', () => ({
  getShard: jest.fn(),
  getShardId: jest.fn()
}));

jest.mock('../src/database/connectionManager', () => ({
  getAllPools: jest.fn(),
  getPoolByShardId: jest.fn()
}));

jest.mock('../src/utils/batchInsert', () => ({
  insertBatches: jest.fn()
}));

const { getShard, getShardId } = require('../src/shard');
const { getAllPools, getPoolByShardId } = require('../src/database/connectionManager');
const { insertBatches } = require('../src/utils/batchInsert');
const ordersRepository = require('../src/repositories/orders.repository');

describe('OrdersRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createOrder inserts into routed shard', async () => {
    const pool = {
      query: jest.fn(async () => ({ rows: [{ order_id: 'o-1', customer_id: 'c-1' }] }))
    };

    getShard.mockReturnValue({ shardId: 2, pool });

    const result = await ordersRepository.createOrder({
      order_id: 'o-1',
      customer_id: 'c-1',
      order_date: '2026-01-01T00:00:00.000Z',
      order_amount: 99.99,
      status: 'created'
    });

    expect(result.shardId).toBe(2);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('createOrdersBatch wraps writes in transactions', async () => {
    getShardId.mockImplementation((customerId) => (customerId === 'c-1' ? 1 : 2));

    const client1 = {
      query: jest.fn(async () => undefined),
      release: jest.fn()
    };
    const client2 = {
      query: jest.fn(async () => undefined),
      release: jest.fn()
    };

    getPoolByShardId.mockImplementation((shardId) => ({
      connect: jest.fn(async () => (shardId === 1 ? client1 : client2))
    }));

    insertBatches
      .mockResolvedValueOnce([{ order_id: 'o-1', customer_id: 'c-1' }])
      .mockResolvedValueOnce([{ order_id: 'o-2', customer_id: 'c-2' }]);

    const result = await ordersRepository.createOrdersBatch([
      { order_id: 'o-1', customer_id: 'c-1', order_date: '2026-01-01T00:00:00.000Z', order_amount: 10.0, status: 'created' },
      { order_id: 'o-2', customer_id: 'c-2', order_date: '2026-01-01T00:00:00.000Z', order_amount: 20.0, status: 'created' }
    ]);

    expect(result.insertedCount).toBe(2);
    expect(client1.query).toHaveBeenCalledWith('BEGIN');
    expect(client2.query).toHaveBeenCalledWith('BEGIN');
    expect(client1.query).toHaveBeenCalledWith('COMMIT');
    expect(client2.query).toHaveBeenCalledWith('COMMIT');
  });

  test('getOrderById fan-outs across shards when customer is unknown', async () => {
    getAllPools.mockReturnValue([
      { shardId: 1, pool: { query: jest.fn(async () => ({ rows: [] })) } },
      { shardId: 2, pool: { query: jest.fn(async () => ({ rows: [{ order_id: 'o-100' }] })) } },
      { shardId: 3, pool: { query: jest.fn(async () => ({ rows: [] })) } }
    ]);

    const result = await ordersRepository.getOrderById('o-100');

    expect(result.shardId).toBe(2);
    expect(result.order.order_id).toBe('o-100');
  });
});
