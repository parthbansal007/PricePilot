import pino from 'pino';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

export const logger = pino({
  level: logLevel,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
});

// Middleware to assign a unique request ID and structured logging
export const requestLogger = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  const startTime = performance.now();

  res.on('finish', () => {
    const duration = Math.round(performance.now() - startTime);
    const logData = {
      requestId: reqId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Client Warning');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
};

export default logger;
