const { OK } = require('../constants/httpStatus');
const ordersRepository = require('../repositories/orders.repository');
const { buildSuccessResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const getOrderById = async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();

  if (!orderId) {
    const error = new AppError('orderId is required', 400);
    error.code = 'INVALID_ORDER_ID';
    throw error;
  }

  const customerId = req.query.customerId ? String(req.query.customerId).trim() : null;
  const result = await ordersRepository.getOrderById(orderId, customerId);

  res.status(OK).json(
    buildSuccessResponse({
      message: 'Order fetched successfully',
      data: result
    })
  );
};

const getOrdersByCustomer = async (req, res) => {
  const customerId = String(req.query.customerId || '').trim();

  if (!customerId) {
    const error = new AppError('customerId query parameter is required', 400);
    error.code = 'INVALID_CUSTOMER_ID';
    throw error;
  }

  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = await ordersRepository.getOrdersByCustomer(customerId, {
    status,
    limit,
    offset
  });

  res.status(OK).json(
    buildSuccessResponse({
      message: 'Orders fetched successfully',
      data: result
    })
  );
};

module.exports = {
  getOrderById,
  getOrdersByCustomer
};
