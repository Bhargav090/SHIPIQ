const logger = require('../../utils/logger');

/**
 * Central error handler — keeps route handlers clean.
 */
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  } else {
    logger.warn('Client error', { error: err.message, details: err.details });
  }

  res.status(status).json({
    error: err.name || 'Error',
    message: err.message,
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV !== 'production' && isServerError ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
