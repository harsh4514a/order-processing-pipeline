const request = require('supertest');
const express = require('express');
const metricsRoutes = require('../src/routes/metrics.routes');
const errorHandler = require('../src/middleware/errorHandler');

describe('GET /metrics', () => {
  test('returns metrics data', async () => {
    const app = express();
    app.use('/metrics', metricsRoutes);
    app.use(errorHandler);

    const response = await request(app).get('/metrics');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
