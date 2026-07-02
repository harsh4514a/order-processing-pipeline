jest.mock('../src/services/health.service', () => ({
  getSystemHealth: jest.fn(async () => ({
    status: 'ok',
    application: { uptimeSeconds: 10 },
    database: { connected: true },
    gcs: { healthy: true }
  }))
}));

const healthController = require('../src/controllers/health.controller');

describe('healthController', () => {
  test('returns health payload', async () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await healthController.getHealth(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });
});
