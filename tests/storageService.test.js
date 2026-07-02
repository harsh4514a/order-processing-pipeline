jest.mock('../src/storage/storageClient', () => ({
  getBucket: jest.fn()
}));

const { getBucket } = require('../src/storage/storageClient');
const storageService = require('../src/services/storage.service');
const config = require('../src/config/env');

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploadBuffer succeeds and returns metadata', async () => {
    const save = jest.fn(async () => undefined);
    const getMetadata = jest.fn(async () => [
      {
        generation: '123456789',
        size: '11',
        contentType: 'text/csv',
        timeCreated: '2026-07-01T00:00:00.000Z'
      }
    ]);

    getBucket.mockResolvedValue({
      file: jest.fn(() => ({ save, getMetadata }))
    });

    const result = await storageService.uploadBuffer(
      Buffer.from('a,b\n1,2\n'),
      'orders.csv',
      { contentType: 'text/csv' }
    );

    expect(result.bucket).toBe(config.gcs.bucketName);
    expect(result.fileName.startsWith('orders-')).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('rejects invalid MIME type', async () => {
    await expect(
      storageService.uploadBuffer(Buffer.from('data'), 'orders.csv', { contentType: 'application/pdf' })
    ).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
  });

  test('maps authentication failures', async () => {
    const save = jest.fn(async () => {
      const error = new Error('Unauthenticated');
      error.code = 401;
      throw error;
    });

    getBucket.mockResolvedValue({
      file: jest.fn(() => ({ save, getMetadata: jest.fn() }))
    });

    await expect(
      storageService.uploadBuffer(Buffer.from('a,b\n1,2\n'), 'orders.csv', { contentType: 'text/csv' })
    ).rejects.toMatchObject({ code: 'GCS_AUTHENTICATION_FAILURE' });
  });

  test('maps bucket missing failure', async () => {
    const save = jest.fn(async () => {
      const error = new Error('Bucket not found');
      error.code = 404;
      throw error;
    });

    getBucket.mockResolvedValue({
      file: jest.fn(() => ({ save, getMetadata: jest.fn() }))
    });

    await expect(
      storageService.uploadBuffer(Buffer.from('a,b\n1,2\n'), 'orders.csv', { contentType: 'text/csv' })
    ).rejects.toMatchObject({ code: 'GCS_NOT_FOUND' });
  });

  test('maps timeout/network failure', async () => {
    const save = jest.fn(async () => {
      const error = new Error('Request timed out');
      error.code = 'ETIMEDOUT';
      throw error;
    });

    getBucket.mockResolvedValue({
      file: jest.fn(() => ({ save, getMetadata: jest.fn() }))
    });

    await expect(
      storageService.uploadBuffer(Buffer.from('a,b\n1,2\n'), 'orders.csv', { contentType: 'text/csv' })
    ).rejects.toMatchObject({ code: 'GCS_TIMEOUT' });
  });

  test('generateUniqueFilename creates collision-safe name', () => {
    const fileName = storageService.generateUniqueFilename('orders.csv');

    expect(fileName.startsWith('orders-')).toBe(true);
    expect(fileName.endsWith('.csv')).toBe(true);
  });
});
