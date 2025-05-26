
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJsonString || serviceAccountJsonString.trim() === '') {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set or is empty. Firebase Admin SDK will not be initialized.');
    } else {
      try {
        const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJsonString);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK Initialized');
        db = admin.firestore();
      } catch (parseError: any) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid, single-line JSON string.');
        console.error('Parsing Error:', parseError.message);
        // Log a snippet of what was attempted to be parsed, being careful not to log sensitive parts if possible
        const snippet = serviceAccountJsonString.substring(0, Math.min(serviceAccountJsonString.length, 200)) + (serviceAccountJsonString.length > 200 ? '...' : '');
        console.error('Attempted to parse (snippet):', snippet);

      }
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK Initialization Error (outer catch):', error.message);
  }
} else {
  // If already initialized, get the default app's firestore instance
  const existingApp = admin.apps[0];
  if (existingApp) {
    db = existingApp.firestore();
    if (db) {
      console.log('Firebase Admin SDK already initialized, re-using existing instance.');
    } else {
      console.error('Firebase Admin SDK was already initialized, but failed to get Firestore instance from existing app.');
    }
  } else {
     console.error('Firebase Admin SDK apps array was not empty, but the first app was null/undefined.');
  }
}

export { db };
