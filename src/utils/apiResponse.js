const buildSuccessResponse = ({ message, data = null, meta = null }) => ({
  success: true,
  message,
  data,
  meta
});

const buildErrorResponse = ({ message, code, details = null }) => ({
  success: false,
  message,
  code,
  details
});

module.exports = {
  buildSuccessResponse,
  buildErrorResponse
};
