import { adminAuth } from '../config/firebase-admin.js';
import { logger } from '../utils/logger.js';

export const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Explicit dev bypass ONLY when NODE_ENV=development AND ALLOW_DEV_AUTH_BYPASS=true
  const isDev = process.env.NODE_ENV === 'development';
  const allowDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS === 'true';

  if (isDev && allowDevBypass && (token === 'dev-bypass' || req.headers['x-dev-bypass'] === 'true')) {
    logger.warn({ requestId: req.id }, 'WARNING: Authentication bypassed via ALLOW_DEV_AUTH_BYPASS.');
    req.user = {
      uid: 'dev-user-001',
      email: 'dev@pricepilot.local',
      name: 'Development User',
    };
    return next();
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  if (!adminAuth) {
    logger.error({ requestId: req.id }, 'Firebase Admin authentication provider is uninitialized.');
    return res.status(503).json({ message: 'Authentication service temporarily unavailable' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.warn({ requestId: req.id, error: error.message }, 'Firebase token verification failed');
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const optionalProtect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  const isDev = process.env.NODE_ENV === 'development';
  const allowDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS === 'true';

  if (isDev && allowDevBypass && (token === 'dev-bypass' || req.headers['x-dev-bypass'] === 'true')) {
    req.user = {
      uid: 'dev-user-001',
      email: 'dev@pricepilot.local',
      name: 'Development User',
    };
    return next();
  }

  if (!token) {
    return next();
  }

  if (!adminAuth) {
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    next();
  }
};

