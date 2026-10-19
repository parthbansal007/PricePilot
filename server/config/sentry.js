import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger.js';

let isSentryInitialized = false;

export const initSentry = (app) => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0
    });
    isSentryInitialized = true;
    logger.info('Sentry error tracing initialized successfully.');
  } catch (err) {
    logger.warn({ error: err.message }, 'Failed to initialize Sentry; continuing without Sentry.');
  }
};

export const captureException = (error, context = {}) => {
  if (isSentryInitialized) {
    Sentry.captureException(error, { extra: context });
  }
};
