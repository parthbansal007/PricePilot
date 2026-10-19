import { logger } from '../utils/logger.js';
import { captureException } from '../config/sentry.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = req.id || 'unknown';

  logger.error(
    {
      requestId,
      statusCode,
      url: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: err.stack
    },
    'Centralized error handler caught an error'
  );

  // Capture unexpected 5xx errors to Sentry
  if (statusCode >= 500) {
    captureException(err, { requestId, url: req.originalUrl, method: req.method });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    message: statusCode >= 500 && isProduction ? 'An unexpected server error occurred' : err.message,
    requestId,
    ...(isProduction ? {} : { stack: err.stack })
  });
};
