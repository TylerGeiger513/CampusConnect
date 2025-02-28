// middleware/errorHandler.js
const config = require('../config/config');

module.exports = (err, req, res, next) => {
  // Log full error details to the console for internal debugging.
  console.error(err.stack);

  // Prepare a sanitized error response.
  const response = {
    message: err.message || 'Internal Server Error',
  };

  // Include the stack trace only in non-production environments.
  if (config.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
};
