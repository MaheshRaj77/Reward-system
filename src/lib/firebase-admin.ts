// Firebase Admin SDK for server-side operations
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    // Check for service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
        try {
            const parsedServiceAccount = JSON.parse(serviceAccount);
            admin.initializeApp({
                credential: admin.credential.cert(parsedServiceAccount),
            });
        } catch (error) {
            console.error('Error parsing Firebase service account:', error);
        }
    } else {
        // Fallback: try to use application default credentials
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        } catch (error) {
            console.warn('Firebase Admin not initialized - missing credentials');
        }
    }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminMessaging = admin.apps.length ? admin.messaging() : null;
export default admin;
