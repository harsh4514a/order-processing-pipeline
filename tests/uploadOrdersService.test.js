jest.mock('../src/services/storage.service', () => ({
  uploadFile: jest.fn(),
  fileExists: jest.fn()
}));

jest.mock('../src/repositories/orders.repository', () => ({
  createOrdersBatch: jest.fn()
}));

jest.mock('../src/utils/fileParserFactory', () => ({
  resolveParser: jest.fn()
}));

jest.mock('../src/utils/fileFingerprint', () => ({
  computeFileSha256: jest.fn(async () => 'fingerprint-1')
}));

jest.mock('../src/repositories/uploadRegistry.repository', () => ({
  existsByFingerprint: jest.fn(),
  createEntry: jest.fn()
}));

const fs = require('fs/promises');
const storageService = require('../src/services/storage.service');
const ordersRepository = require('../src/repositories/orders.repository');
const { resolveParser } = require('../src/utils/fileParserFactory');
const uploadRegistryRepository = require('../src/repositories/uploadRegistry.repository');
const uploadOrdersService = require('../src/services/uploadOrders.service');

describe('UploadOrdersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fs, 'unlink').mockResolvedValue();
    uploadRegistryRepository.existsByFingerprint.mockResolvedValue(false);
    uploadRegistryRepository.createEntry.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('processes CSV rows with batching summary', async () => {
    storageService.uploadFile.mockResolvedValue({
      fileName: 'orders-1.csv',
      bucket: 'bucket-1'
    });
    storageService.fileExists.mockResolvedValue(true);

    resolveParser.mockReturnValue(async ({ onRow }) => {
      await onRow({ order_id: 'o1', customer_id: 'c1', order_date: '2026-01-01', order_amount: '10.00', status: 'Pending' }, 2);
      await onRow({ order_id: 'o2', customer_id: 'c2', order_date: '2026-01-01', order_amount: '20.00', status: 'Completed' }, 3);
    });

    ordersRepository.createOrdersBatch.mockResolvedValue({ insertedCount: 2 });

    const result = await uploadOrdersService.processUpload({
      path: '/tmp/orders.csv',
      originalname: 'orders.csv',
      mimetype: 'text/csv',
      size: 100
    });

    expect(result.success).toBe(true);
    expect(result.insertedRows).toBe(2);
    expect(result.failedRows).toBe(0);
  });

  test('collects invalid rows and continues', async () => {
    storageService.uploadFile.mockResolvedValue({ fileName: 'orders-1.csv', bucket: 'bucket-1' });
    storageService.fileExists.mockResolvedValue(true);

    resolveParser.mockReturnValue(async ({ onRow }) => {
      await onRow({ order_id: '', customer_id: 'c1', order_date: '2026-01-01', order_amount: '10.00', status: 'Pending' }, 2);
      await onRow({ order_id: 'o2', customer_id: 'c2', order_date: '2026-01-01', order_amount: '20.00', status: 'Completed' }, 3);
    });

    ordersRepository.createOrdersBatch.mockResolvedValue({ insertedCount: 1 });

    const result = await uploadOrdersService.processUpload({
      path: '/tmp/orders.csv',
      originalname: 'orders.csv',
      mimetype: 'text/csv',
      size: 100
    });

    expect(result.failedRows).toBe(1);
    expect(result.insertedRows).toBe(1);
    expect(result.failedRowDetails).toHaveLength(1);
  });

  test('throws when parser is unsupported', async () => {
    resolveParser.mockReturnValue(null);

    await expect(
      uploadOrdersService.processUpload({
        path: '/tmp/orders.exe',
        originalname: 'orders.exe',
        mimetype: 'application/octet-stream',
        size: 100
      })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE_FORMAT' });
  });

  test('rejects duplicate file fingerprint', async () => {
    uploadRegistryRepository.existsByFingerprint.mockResolvedValue(true);

    await expect(
      uploadOrdersService.processUpload({
        path: '/tmp/orders.csv',
        originalname: 'orders.csv',
        mimetype: 'text/csv',
        size: 100
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_FILE_UPLOAD' });
  });
});
