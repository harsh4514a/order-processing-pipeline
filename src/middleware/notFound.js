const { NOT_FOUND } = require('../constants/httpStatus');
const { ROUTE_NOT_FOUND } = require('../constants/messages');
const { buildErrorResponse } = require('../utils/apiResponse');

const notFound = (req, res) => {
  res.status(NOT_FOUND).json(
    buildErrorResponse({
      message: ROUTE_NOT_FOUND,
      code: 'ROUTE_NOT_FOUND'
    })
  );
};

module.exports = notFound;
