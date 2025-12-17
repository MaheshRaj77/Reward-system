// ============================================
// PARENT AUTHENTICATION
// Email/password + Google auth for parents using Firebase
// ============================================

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    updateProfile,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import type { Parent, Family, SubscriptionTier } from '@/types';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export interface AuthResult {
    success: boolean;
    user?: FirebaseUser;
    parent?: Parent;
    error?: string;
}

export interface RegistrationData {
    email: string;
    password: string;
    name: string;
    familyName: string;
    timezone?: string;
}

/**
 * Parent Authentication Service
 * 
 * Handles all parent authentication flows:
 * - Registration with family creation
 * - Login/logout
 * - Password recovery
 * - Session management
 */
export class ParentAuth {
    /**
     * Registers a new parent account and creates their family.
     */
    static async register(data: RegistrationData): Promise<AuthResult> {
        try {
            // Ensure session persistence
            await setPersistence(auth, browserLocalPersistence);

            // Create Firebase Auth user
            const credential = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );
            const user = credential.user;

            // Update display name
            await updateProfile(user, { displayName: data.name });

            // Create family document
            const familyId = `family_${user.uid}`;
            const family: Omit<Family, 'createdAt'> & { createdAt: unknown } = {
                id: familyId,
                name: data.familyName,
                createdAt: serverTimestamp(),
                subscription: 'free' as SubscriptionTier,
                settings: {
                    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    weekStartDay: 1, // Monday
                    notificationPreferences: {
                        emailDigest: 'weekly',
                        pushApprovals: true,
                        pushRedemptions: true,
                        pushInactivity: true,
                        inactivityThresholdDays: 3,
                    },
                    screenTimeDefaults: {
                        defaultDailyLimitMinutes: 60,
                        bonusAllowedDays: ['weekend', 'holiday'],
                        bonusWindowStart: '14:00',
                        bonusWindowEnd: '20:00',
                    },
                    starSettings: {
                        weeklyCap: 100,
                        streakBonusPercent: 10,
                        maxStreakBonus: 50,
                        enableExpiry: false,
                    },
                },
                parentIds: [user.uid],
                childIds: [],
            };

            await setDoc(doc(db, 'families', familyId), family);

            // Create subscription for new parent (starts with free plan)
            const now = Timestamp.now();
            const oneMonthFromNow = new Timestamp(
                now.seconds + 30 * 24 * 60 * 60,
                now.nanoseconds
            );

            // Create parent document with free subscription
            const parent: Omit<Parent, 'createdAt'> & { createdAt: unknown } = {
                id: user.uid,
                email: data.email,
                name: data.name,
                familyId,
                role: 'admin',
                subscription: {
                    plan: 'free',
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: oneMonthFromNow,
                },
                createdAt: serverTimestamp(),
                isProfileComplete: false,
            };

            await setDoc(doc(db, 'parents', user.uid), parent);

            // Email sending will be handled by API route after registration succeeds
            // This keeps the email service server-only to avoid bundling issues

            return {
                success: true,
                user,
                parent: parent as unknown as Parent,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            return {
                success: false,
                error: message,
            };
        }
    }

    /**
     * Signs in an existing parent.
     */
    static async login(email: string, password: string): Promise<AuthResult> {
        try {
            // Ensure session persistence
            await setPersistence(auth, browserLocalPersistence);

            const credential = await signInWithEmailAndPassword(auth, email, password);
            const user = credential.user;

            // Fetch parent document
            const parentDoc = await getDoc(doc(db, 'parents', user.uid));
            if (!parentDoc.exists()) {
                return {
                    success: false,
                    error: 'Parent profile not found',
                };
            }

            return {
                success: true,
                user,
                parent: parentDoc.data() as Parent,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return {
                success: false,
                error: message,
            };
        }
    }

    /**
     * Signs out the current parent.
     */
    static async logout(): Promise<{ success: boolean; error?: string }> {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Logout failed';
            return { success: false, error: message };
        }
    }

    /**
     * Sends a password reset email.
     */
    static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Reset failed';
            return { success: false, error: message };
        }
    }

    /**
     * Changes the password for the current user.
     */
    static async changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
        try {
            const user = auth.currentUser;
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }
            await updatePassword(user, newPassword);
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Password change failed';
            return { success: false, error: message };
        }
    }

    /**
     * Gets the current authenticated parent.
     * Waits for auth state to be initialized first.
     */
    static async getCurrentParent(): Promise<Parent | null> {
        // Wait for auth to be initialized (session restoration)
        const user = await new Promise<FirebaseUser | null>((resolve) => {
            // If already initialized, return immediately
            if (auth.currentUser !== undefined) {
                // Check if auth state listener has fired at least once
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    unsubscribe();
                    resolve(user);
                });
            } else {
                resolve(auth.currentUser);
            }
        });

        if (!user) return null;

        const parentDoc = await getDoc(doc(db, 'parents', user.uid));
        return parentDoc.exists() ? (parentDoc.data() as Parent) : null;
    }

    /**
     * Subscribes to auth state changes.
     */
    static onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
        return onAuthStateChanged(auth, callback);
    }

    /**
     * Gets the current Firebase user.
     */
    static getCurrentUser(): FirebaseUser | null {
        return auth.currentUser;
    }

    /**
     * Signs in with Google.
     * Creates family and parent docs if first time.
     */
    static async loginWithGoogle(): Promise<AuthResult> {
        try {
            // Ensure session persistence
            await setPersistence(auth, browserLocalPersistence);

            const credential = await signInWithPopup(auth, googleProvider);
            const user = credential.user;

            // Check if parent already exists
            const parentDoc = await getDoc(doc(db, 'parents', user.uid));

            if (parentDoc.exists()) {
                // Existing user
                return {
                    success: true,
                    user,
                    parent: parentDoc.data() as Parent,
                };
            }

            // New user - create family and parent
            const familyId = `family_${user.uid}`;
            const userName = user.displayName || 'Parent';
            const userEmail = user.email || '';

            const family: Omit<Family, 'createdAt'> & { createdAt: unknown } = {
                id: familyId,
                name: `${userName}'s Family`,
                createdAt: serverTimestamp(),
                subscription: 'free' as SubscriptionTier,
                settings: {
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    weekStartDay: 1,
                    notificationPreferences: {
                        emailDigest: 'weekly',
                        pushApprovals: true,
                        pushRedemptions: true,
                        pushInactivity: true,
                        inactivityThresholdDays: 3,
                    },
                    screenTimeDefaults: {
                        defaultDailyLimitMinutes: 60,
                        bonusAllowedDays: ['weekend', 'holiday'],
                        bonusWindowStart: '14:00',
                        bonusWindowEnd: '20:00',
                    },
                    starSettings: {
                        weeklyCap: 100,
                        streakBonusPercent: 10,
                        maxStreakBonus: 50,
                        enableExpiry: false,
                    },
                },
                parentIds: [user.uid],
                childIds: [],
            };

            await setDoc(doc(db, 'families', familyId), family);

            const now = Timestamp.now();
            const oneMonthFromNow = new Timestamp(
                now.seconds + 30 * 24 * 60 * 60,
                now.nanoseconds
            );

            const parent: Omit<Parent, 'createdAt'> & { createdAt: unknown } = {
                id: user.uid,
                email: userEmail,
                name: userName,
                familyId,
                role: 'admin',
                subscription: {
                    plan: 'free',
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: oneMonthFromNow,
                },
                createdAt: serverTimestamp(),
                isProfileComplete: false,
            };

            await setDoc(doc(db, 'parents', user.uid), parent);

            return {
                success: true,
                user,
                parent: parent as unknown as Parent,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Google sign-in failed';
            return {
                success: false,
                error: message,
            };
        }
    }
}

// Export singleton-style functions
export const registerParent = ParentAuth.register.bind(ParentAuth);
export const loginParent = ParentAuth.login.bind(ParentAuth);
export const loginWithGoogle = ParentAuth.loginWithGoogle.bind(ParentAuth);
export const logoutParent = ParentAuth.logout.bind(ParentAuth);
export const resetParentPassword = ParentAuth.resetPassword.bind(ParentAuth);
export const getCurrentParent = ParentAuth.getCurrentParent.bind(ParentAuth);
export const onParentAuthStateChange = ParentAuth.onAuthStateChange.bind(ParentAuth);

