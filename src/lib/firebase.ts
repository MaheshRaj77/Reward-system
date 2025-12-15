// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
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

// Initialize Firebase - only once and only if we have valid config
let app: any;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;

try {
  const apps = getApps();
  app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Analytics (only in browser)
  if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
  }
} catch (error) {
  // Handle initialization errors gracefully during build
  console.warn('Firebase initialization error (this may be expected during build):', error);
  // Provide dummy implementations for server-side rendering
  if (typeof window === "undefined") {
    auth = null as any;
    db = null as any;
  } else {
    throw error;
  }
}

// Export app and analytics
export { app, analytics, auth, db };
