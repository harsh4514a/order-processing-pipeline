const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const healthController = require('../controllers/health.controller');

const router = Router();

router.get('/', asyncHandler(healthController.getHealth));

module.exports = router;
