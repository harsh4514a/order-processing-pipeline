const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const ordersController = require('../controllers/orders.controller');

const router = Router();

router.get('/:orderId', asyncHandler(ordersController.getOrderById));
router.get('/', asyncHandler(ordersController.getOrdersByCustomer));

module.exports = router;
