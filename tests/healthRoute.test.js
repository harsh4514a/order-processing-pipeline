const request = require('supertest');
const express = require('express');

jest.mock('../src/services/health.service', () => ({
  getSystemHealth: jest.fn(async () => ({
    status: 'ok',
    application: { uptimeSeconds: 10, nodeVersion: process.version },
    database: { connected: true, shards: { healthy: true } },
    gcs: { healthy: true },
    memory: { rss: 1000 },
    timestamp: new Date().toISOString()
  }))
}));

const healthRoutes = require('../src/routes/health.routes');
const errorHandler = require('../src/middleware/errorHandler');

describe('GET /health', () => {
  test('returns health status payload', async () => {
    const app = express();
    app.use('/health', healthRoutes);
    app.use(errorHandler);

    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});
