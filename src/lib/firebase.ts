// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase config is valid (has required fields)
const hasValidConfig = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

// Initialize Firebase - only once and only if we have valid config
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _analytics: Analytics | null = null;

if (hasValidConfig) {
  try {
    const apps = getApps();
    _app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);

    // Initialize Analytics (only in browser)
    if (typeof window !== "undefined") {
      _analytics = getAnalytics(_app);
    }
  } catch (error) {
    // Handle initialization errors gracefully during build
    console.warn('Firebase initialization error:', error);
  }
} else {
  // Skip Firebase initialization during build (no env vars)
  if (typeof window !== "undefined") {
    console.warn('Firebase config missing - check environment variables');
  }
}

// Export with type assertions - at runtime these will be initialized
// The ! assertion tells TypeScript these are non-null at runtime
export const app = _app!;
export const analytics = _analytics;
export const auth: Auth = _auth!;
export const db: Firestore = _db!;
