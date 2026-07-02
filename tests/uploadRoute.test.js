const request = require('supertest');
const express = require('express');

jest.mock('../src/services/uploadOrders.service', () => ({
  processUpload: jest.fn(async () => ({
    success: true,
    fileName: 'orders-1.csv',
    bucket: 'bucket-1',
    totalRows: 2,
    processedRows: 2,
    insertedRows: 2,
    failedRows: 0,
    processingTime: '20ms',
    uploadTime: '10ms',
    batchSize: 500
  }))
}));

const uploadOrdersRoutes = require('../src/routes/uploadOrders.routes');
const errorHandler = require('../src/middleware/errorHandler');

describe('POST /upload-orders', () => {
  test('accepts one file and returns summary', async () => {
    const app = express();
    app.use('/upload-orders', uploadOrdersRoutes);
    app.use(errorHandler);

    const response = await request(app)
      .post('/upload-orders')
      .attach('file', Buffer.from('order_id,customer_id,order_date,order_amount,status\no1,c1,2026-01-01,10,Pending'), {
        filename: 'orders.csv',
        contentType: 'text/csv'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('rejects unsupported file type', async () => {
    const app = express();
    app.use('/upload-orders', uploadOrdersRoutes);
    app.use(errorHandler);

    const response = await request(app)
      .post('/upload-orders')
      .attach('file', Buffer.from('binary'), {
        filename: 'virus.exe',
        contentType: 'application/octet-stream'
      });

    expect(response.statusCode).toBe(400);
  });
});
