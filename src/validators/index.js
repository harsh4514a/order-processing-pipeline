const validateRequest = (req, res, next) => {
  // Central validator hook for future route-level validation chains.
  next();
};

module.exports = {
  validateRequest
};
