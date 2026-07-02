jest.mock('../src/storage/storageClient', () => ({
  getStorageClient: jest.fn(),
  getBucket: jest.fn()
}));

const { getStorageClient, getBucket } = require('../src/storage/storageClient');
const { checkGCSConnection } = require('../src/utils/checkGCSConnection');

describe('checkGCSConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns healthy when ADC and permissions are valid', async () => {
    getStorageClient.mockResolvedValue({
      getBuckets: jest.fn(async () => [[]])
    });

    getBucket.mockResolvedValue({
      name: 'bucket-1',
      exists: jest.fn(async () => [true]),
      iam: {
        testPermissions: jest.fn(async () => [['storage.objects.create']])
      }
    });

    const result = await checkGCSConnection();

    expect(result.healthy).toBe(true);
  });

  test('returns unhealthy when authentication fails', async () => {
    getStorageClient.mockRejectedValue(Object.assign(new Error('Unauthenticated'), { code: 401 }));

    const result = await checkGCSConnection();

    expect(result.healthy).toBe(false);
    expect(result.code).toBe('GCS_AUTHENTICATION_FAILURE');
  });

  test('returns unhealthy when bucket is missing', async () => {
    getStorageClient.mockResolvedValue({
      getBuckets: jest.fn(async () => [[]])
    });

    getBucket.mockResolvedValue({
      name: 'missing-bucket',
      exists: jest.fn(async () => [false]),
      iam: {
        testPermissions: jest.fn(async () => [[]])
      }
    });

    const result = await checkGCSConnection();

    expect(result.healthy).toBe(false);
  });
});
