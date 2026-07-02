const { OK } = require('../constants/httpStatus');
const healthService = require('../services/health.service');
const { buildSuccessResponse } = require('../utils/apiResponse');

const getHealth = async (req, res) => {
  const healthData = await healthService.getSystemHealth();

  res.status(OK).json(
    buildSuccessResponse({
      message: 'Service is healthy',
      data: healthData
    })
  );
};

module.exports = {
  getHealth
};
