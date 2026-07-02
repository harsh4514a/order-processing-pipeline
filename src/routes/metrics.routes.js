const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const metricsController = require('../controllers/metrics.controller');

const router = Router();

router.get('/', asyncHandler(metricsController.getMetricsSummary));

module.exports = router;
