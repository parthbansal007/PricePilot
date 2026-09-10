import { adminAuth } from '../config/firebase-admin.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    // If we're in mock mode (no project ID configured), just decode the token without verification
    // This allows the UI to work in local development without full Firebase configuration
    if (!process.env.FIREBASE_PROJECT_ID || !adminAuth) {
      console.warn('Mock Mode: Skipping Firebase token signature verification.');
      // Simple mock user based on the token string for development testing
      req.user = {
        uid: 'mock-uid-123',
        email: 'mock@example.com',
        name: 'Mock User',
      };
      return next();
    }

    // Real verification
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
