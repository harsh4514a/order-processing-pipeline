const { Router } = require('express');
const healthRoutes = require('./health.routes');
const uploadOrdersRoutes = require('./uploadOrders.routes');
const ordersRoutes = require('./orders.routes');
const metricsRoutes = require('./metrics.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/metrics', metricsRoutes);
router.use('/upload-orders', uploadOrdersRoutes);
router.use('/orders', ordersRoutes);

module.exports = router;
