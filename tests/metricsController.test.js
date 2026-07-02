const metricsController = require('../src/controllers/metrics.controller');
const { recordUploadSummary } = require('../src/utils/metricsRegistry');

describe('metricsController', () => {
  test('returns aggregate metrics', async () => {
    recordUploadSummary({
      processedRows: 10,
      insertedRows: 8,
      failedRows: 2,
      processingTimeMs: 100,
      uploadTimeMs: 40
    });

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await metricsController.getMetricsSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });
});
