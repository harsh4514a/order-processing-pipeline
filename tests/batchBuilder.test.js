const { createBatchBuilder } = require('../src/utils/batchBuilder');

describe('batchBuilder', () => {
  test('flushes batches based on batch size', async () => {
    const received = [];
    const builder = createBatchBuilder({
      batchSize: 2,
      onBatch: async (rows, batchNo) => {
        received.push({ rows, batchNo });
      }
    });

    await builder.push({ id: 1 });
    await builder.push({ id: 2 });
    await builder.push({ id: 3 });
    await builder.finalize();

    expect(received).toHaveLength(2);
    expect(received[0].rows).toHaveLength(2);
    expect(received[1].rows).toHaveLength(1);
  });
});
