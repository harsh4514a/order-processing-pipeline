jest.mock('../src/repositories/orders.repository', () => ({
  getOrderById: jest.fn(),
  getOrdersByCustomer: jest.fn()
}));

const ordersRepository = require('../src/repositories/orders.repository');
const ordersController = require('../src/controllers/orders.controller');

describe('ordersController', () => {
  test('getOrderById returns order details', async () => {
    ordersRepository.getOrderById.mockResolvedValue({ shardId: 1, order: { order_id: 'o-1' } });

    const req = { params: { orderId: 'o-1' }, query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await ordersController.getOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getOrdersByCustomer validates customerId', async () => {
    const req = { query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await expect(ordersController.getOrdersByCustomer(req, res)).rejects.toMatchObject({
      code: 'INVALID_CUSTOMER_ID'
    });
  });
});
