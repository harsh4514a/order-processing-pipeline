const { OK } = require('../constants/httpStatus');
const { buildSuccessResponse } = require('../utils/apiResponse');
const { getMetrics } = require('../utils/metricsRegistry');

const getMetricsSummary = async (req, res) => {
  const metrics = getMetrics();

  res.status(OK).json(
    buildSuccessResponse({
      message: 'Metrics fetched successfully',
      data: metrics
    })
  );
};

module.exports = {
  getMetricsSummary
};
