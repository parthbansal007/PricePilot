import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

let adminAuth = null;

try {
  const isProduction = process.env.NODE_ENV === 'production';
  const projectId = process.env.FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, '');
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    adminAuth = getAuth(app);
    logger.info('Firebase Admin initialized successfully with service credentials');
  } else {
    if (isProduction) {
      logger.fatal('Missing Firebase Admin credentials in production.');
      throw new Error('Missing Firebase Admin credentials in production (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
    } else {
      logger.warn('Firebase Admin credentials not configured. Auth verification will fail unless ALLOW_DEV_AUTH_BYPASS=true in development.');
    }
  }
} catch (error) {
  logger.error({ error: error.message }, 'Firebase Admin initialization error');
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}

export { adminAuth };
