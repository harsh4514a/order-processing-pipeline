jest.mock('../src/services/storage.service', () => ({
  uploadFile: jest.fn(async () => ({ fileName: 'orders-1.csv', bucket: 'bucket-1' })),
  fileExists: jest.fn(async () => true)
}));

jest.mock('../src/repositories/orders.repository', () => ({
  createOrdersBatch: jest.fn(async (rows) => ({ insertedCount: rows.length }))
}));

jest.mock('../src/repositories/uploadRegistry.repository', () => ({
  existsByFingerprint: jest.fn(async () => false),
  createEntry: jest.fn(async () => undefined)
}));

jest.mock('../src/utils/fileFingerprint', () => ({
  computeFileSha256: jest.fn(async () => 'fingerprint-large')
}));

jest.mock('../src/utils/fileParserFactory', () => ({
  resolveParser: jest.fn()
}));

const fs = require('fs/promises');
const { resolveParser } = require('../src/utils/fileParserFactory');
const ordersRepository = require('../src/repositories/orders.repository');
const uploadOrdersService = require('../src/services/uploadOrders.service');

describe('Large upload processing', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'unlink').mockResolvedValue();
    resolveParser.mockReturnValue(async ({ onRow }) => {
      for (let i = 0; i < 10001; i += 1) {
        await onRow({
          order_id: `order-${i}`,
          customer_id: `customer-${i}`,
          order_date: '2026-01-01',
          order_amount: '99.99',
          status: 'Pending'
        }, i + 2);
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('handles 10,000+ rows in batches', async () => {
    const result = await uploadOrdersService.processUpload({
      path: '/tmp/orders.csv',
      originalname: 'orders.csv',
      mimetype: 'text/csv',
      size: 1024
    });

    expect(result.totalRows).toBe(10001);
    expect(ordersRepository.createOrdersBatch).toHaveBeenCalled();
    expect(result.insertedRows).toBe(10001);
  });
});
