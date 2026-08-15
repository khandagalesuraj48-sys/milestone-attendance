import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  Auth
} from 'firebase/auth';

// Milestone Consultancy Firebase Web App Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDSIpSjeqKORFwDrU-dVUeuztXh-WLELxk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "milestone-attendance.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "milestone-attendance",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "milestone-attendance.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "496017896285",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:496017896285:web:7ecb5780d19a7eef052eb4",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-34R6WHB0JD",
};

// Initialize Firebase App instance safely (singleton pattern)
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth instance with robust browserLocalPersistence
// This prevents IndexedDB visibilitychange / pagehide 'Database is closing/hidden' errors.
let authInstance: Auth;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: [browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence],
  });
} catch {
  // If already initialized, get the existing instance
  authInstance = getAuth(firebaseApp);
}

export const auth = authInstance;

