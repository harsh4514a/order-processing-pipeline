const { insertBatches } = require('../src/utils/batchInsert');

describe('Batch insert utility', () => {
  test('splits inserts into configured batch size with prepared statements', async () => {
    const rows = Array.from({ length: 1200 }, (_, index) => [
      `order-${index}`,
      `customer-${index}`,
      '2026-01-01T00:00:00.000Z',
      10.5,
      'created'
    ]);

    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] })
    };

    await insertBatches({
      client,
      tableName: 'orders',
      columns: ['order_id', 'customer_id', 'order_date', 'order_amount', 'status'],
      rows,
      batchSize: 500,
      statementBaseName: 'orders_batch'
    });

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.query.mock.calls[0][0].name).toBe('orders_batch_0');
    expect(client.query.mock.calls[1][0].name).toBe('orders_batch_1');
    expect(client.query.mock.calls[2][0].name).toBe('orders_batch_2');
    expect(client.query.mock.calls[0][0].text).toContain('INSERT INTO orders');
    expect(client.query.mock.calls[0][0].values.length).toBe(500 * 5);
  });
});
