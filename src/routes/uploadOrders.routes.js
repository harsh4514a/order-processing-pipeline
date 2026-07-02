const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const uploadOrdersController = require('../controllers/uploadOrders.controller');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');

const router = Router();

router.post('/', uploadMiddleware, asyncHandler(uploadOrdersController.uploadOrders));

module.exports = router;
