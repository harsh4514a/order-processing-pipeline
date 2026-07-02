const { getShardId, getShard, hashCustomerId } = require('../src/shard/router');

describe('Shard router', () => {
  test('returns deterministic shard for same customer', () => {
    const customerId = 'customer-123';

    const first = getShardId(customerId);
    const second = getShardId(customerId);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThanOrEqual(3);
  });

  test('hash function returns stable 32-bit integer', () => {
    const hash = hashCustomerId('customer-abc');

    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
  });

  test('getShard returns shard id and pool object', () => {
    const result = getShard('customer-456');

    expect(result).toHaveProperty('shardId');
    expect(result).toHaveProperty('pool');
  });
});
