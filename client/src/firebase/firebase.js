// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || ''
};

// Do NOT initialize Firebase if required values are missing.
// This avoids the "Missing App configuration value: projectId" runtime error.
const required = ['projectId', 'apiKey'];
const missing = required.filter(k => !firebaseConfig[k]);

let app = null;
let analytics = null;
let auth = null;
let db = null;
let isFirebaseEnabled = false;

if (missing.length) {
  console.error(
    `Firebase NOT initialized. Missing env vars: ${missing
      .map(k => 'REACT_APP_FIREBASE_' + k.toUpperCase())
      .join(', ')}. Add them to client/.env (ignored by git) or inject at build time.`
  );
} else {
  // Initialize normally
  const appInstance = initializeApp(firebaseConfig);

  let analyticsInstance = null;
  try {
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      analyticsInstance = getAnalytics(appInstance);
    }
  } catch (e) {
    // analytics may fail in some environments; tolerate it
    console.warn('Firebase analytics not initialized:', e.message);
  }

  app = appInstance;
  analytics = analyticsInstance;
  auth = getAuth(appInstance);
  db = getFirestore(appInstance);
  isFirebaseEnabled = true;
}

export { app, analytics, auth, db, isFirebaseEnabled };
export default firebaseConfig;