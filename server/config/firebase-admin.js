import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

let adminAuth;

try {
  if (process.env.FIREBASE_PROJECT_ID) {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      }),
    });
    adminAuth = getAuth(app);
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('FIREBASE_PROJECT_ID not found. Firebase Admin is running in mock mode.');
    const app = initializeApp({ projectId: 'mock-project' });
    adminAuth = getAuth(app);
  }
} catch (error) {
  console.error('Firebase admin initialization error', error.stack);
}

export { adminAuth };
