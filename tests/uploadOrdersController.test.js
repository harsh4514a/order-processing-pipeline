const uploadOrdersController = require('../src/controllers/uploadOrders.controller');

jest.mock('../src/services/uploadOrders.service', () => ({
  processUpload: jest.fn()
}));

const uploadOrdersService = require('../src/services/uploadOrders.service');

describe('uploadOrdersController', () => {
  test('returns processing summary', async () => {
    uploadOrdersService.processUpload.mockResolvedValue({ success: true, insertedRows: 2 });

    const req = { file: { originalname: 'orders.csv' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadOrdersController.uploadOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, insertedRows: 2 });
  });
});
