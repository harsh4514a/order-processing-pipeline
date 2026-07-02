const { CREATED } = require('../constants/httpStatus');
const uploadOrdersService = require('../services/uploadOrders.service');

const uploadOrders = async (req, res) => {
  const summary = await uploadOrdersService.processUpload(req.file);
  res.status(CREATED).json(summary);
};

module.exports = {
  uploadOrders
};
