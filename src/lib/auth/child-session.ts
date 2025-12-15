// ============================================
// CHILD SESSION MANAGER
// PIN/Avatar/QR login for children (NO passwords)
// ============================================

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    collection,
    where,
    getDocs,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Child, ChildSession, QRLoginToken, ChildLoginMethod } from '@/types';
import { SESSION_CONFIG } from '@/lib/constants';

// Simple hash function for PIN (in production, use proper crypto)
function hashPin(pin: string): string {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
        const char = pin.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `pin_${Math.abs(hash).toString(16)}`;
}

export interface ChildLoginResult {
    success: boolean;
    session?: ChildSession;
    child?: Child;
    error?: string;
    lockoutRemaining?: number; // milliseconds
}

export interface PinSetupResult {
    success: boolean;
    error?: string;
}

// Track failed PIN attempts (in-memory, should be in DB for production)
const pinAttempts: Map<string, { count: number; lockoutUntil?: number }> = new Map();

/**
 * Child Session Manager
 * 
 * Handles child authentication without passwords:
 * - PIN-based login (4-6 digits)
 * - Avatar selection login
 * - QR code session generation
 * - Parent-approved device sessions
 * 
 * Key principles:
 * - NO email or password for children
 * - Age-appropriate, simple login methods
 * - Parent oversight of sessions
 */
export class ChildSessionManager {
    /**
     * Logs in a child using their PIN.
     */
    static async loginWithPin(
        familyId: string,
        childId: string,
        pin: string,
        deviceId: string
    ): Promise<ChildLoginResult> {
        // Check lockout status
        const attempts = pinAttempts.get(childId) || { count: 0 };
        if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
            return {
                success: false,
                error: 'Too many failed attempts. Try again later.',
                lockoutRemaining: attempts.lockoutUntil - Date.now(),
            };
        }

        try {
            // Fetch child document
            const childDoc = await getDoc(doc(db, 'children', childId));
            if (!childDoc.exists()) {
                return { success: false, error: 'Child not found' };
            }

            const child = childDoc.data() as Child;

            // Verify family match
            if (child.familyId !== familyId) {
                return { success: false, error: 'Invalid family' };
            }

            // Verify PIN
            const hashedInput = hashPin(pin);
            if (child.pin !== hashedInput) {
                // Increment failed attempts
                attempts.count += 1;
                if (attempts.count >= SESSION_CONFIG.maxPinAttempts) {
                    attempts.lockoutUntil = Date.now() + SESSION_CONFIG.pinLockoutDuration;
                }
                pinAttempts.set(childId, attempts);

                return {
                    success: false,
                    error: 'Incorrect PIN',
                    lockoutRemaining: attempts.lockoutUntil ? attempts.lockoutUntil - Date.now() : undefined,
                };
            }

            // Clear attempts on success
            pinAttempts.delete(childId);

            // Create session
            const session = await this.createSession(child, 'pin', deviceId);

            return {
                success: true,
                session,
                child,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return { success: false, error: message };
        }
    }

    /**
     * Logs in a child using avatar selection (for younger children).
     * Parent must have configured avatar-based login for the child.
     */
    static async loginWithAvatar(
        familyId: string,
        avatarId: string,
        deviceId: string
    ): Promise<ChildLoginResult> {
        try {
            // Find child with this avatar in the family
            const childrenQuery = query(
                collection(db, 'children'),
                where('familyId', '==', familyId),
                where('avatar.presetId', '==', avatarId),
                where('loginMethod', '==', 'avatar')
            );

            const snapshot = await getDocs(childrenQuery);
            if (snapshot.empty) {
                return { success: false, error: 'No matching child found' };
            }

            // If multiple children have same avatar (shouldn't happen), take first
            const childDoc = snapshot.docs[0];
            const child = childDoc.data() as Child;

            // Create session
            const session = await this.createSession(child, 'avatar', deviceId);

            return {
                success: true,
                session,
                child,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return { success: false, error: message };
        }
    }

    /**
     * Generates a QR code token for child login.
     * Parent scans this to create a session.
     */
    static async generateQRToken(
        childId: string,
        familyId: string
    ): Promise<{ success: boolean; token?: QRLoginToken; error?: string }> {
        try {
            const token: QRLoginToken = {
                token: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                childId,
                familyId,
                createdAt: Timestamp.now(),
                expiresAt: Timestamp.fromMillis(Date.now() + SESSION_CONFIG.qrTokenDuration),
                used: false,
            };

            await setDoc(doc(db, 'qrTokens', token.token), token);

            return { success: true, token };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Token generation failed';
            return { success: false, error: message };
        }
    }

    /**
     * Validates and consumes a QR token to create a session.
     */
    static async loginWithQRToken(
        token: string,
        deviceId: string
    ): Promise<ChildLoginResult> {
        try {
            const tokenDoc = await getDoc(doc(db, 'qrTokens', token));
            if (!tokenDoc.exists()) {
                return { success: false, error: 'Invalid token' };
            }

            const tokenData = tokenDoc.data() as QRLoginToken;

            // Check expiry
            if (tokenData.expiresAt.toMillis() < Date.now()) {
                return { success: false, error: 'Token expired' };
            }

            // Check if already used
            if (tokenData.used) {
                return { success: false, error: 'Token already used' };
            }

            // Mark token as used
            await updateDoc(doc(db, 'qrTokens', token), { used: true });

            // Fetch child
            const childDoc = await getDoc(doc(db, 'children', tokenData.childId));
            if (!childDoc.exists()) {
                return { success: false, error: 'Child not found' };
            }

            const child = childDoc.data() as Child;

            // Create session
            const session = await this.createSession(child, 'qr', deviceId);

            return {
                success: true,
                session,
                child,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return { success: false, error: message };
        }
    }

    /**
     * Creates a device session pre-approved by parent.
     */
    static async createApprovedDeviceSession(
        childId: string,
        deviceId: string,
        parentId: string
    ): Promise<{ success: boolean; session?: ChildSession; error?: string }> {
        try {
            const childDoc = await getDoc(doc(db, 'children', childId));
            if (!childDoc.exists()) {
                return { success: false, error: 'Child not found' };
            }

            const child = childDoc.data() as Child;

            // Verify parent is in the family
            const familyDoc = await getDoc(doc(db, 'families', child.familyId));
            if (!familyDoc.exists()) {
                return { success: false, error: 'Family not found' };
            }

            const family = familyDoc.data();
            if (!family.parentIds.includes(parentId)) {
                return { success: false, error: 'Unauthorized parent' };
            }

            // Create session
            const session = await this.createSession(child, 'device-session', deviceId);

            return { success: true, session };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Session creation failed';
            return { success: false, error: message };
        }
    }

    /**
     * Creates a new session for a child.
     */
    private static async createSession(
        child: Child,
        method: ChildLoginMethod,
        deviceId: string
    ): Promise<ChildSession> {
        const sessionId = `session_${child.id}_${Date.now()}`;
        const now = Timestamp.now();

        const session: ChildSession = {
            id: sessionId,
            childId: child.id,
            familyId: child.familyId,
            deviceId,
            loginMethod: method,
            createdAt: now,
            expiresAt: Timestamp.fromMillis(Date.now() + SESSION_CONFIG.childSessionDuration),
            lastActive: now,
            isActive: true,
        };

        await setDoc(doc(db, 'childSessions', sessionId), session);

        // Update child's lastActive
        await updateDoc(doc(db, 'children', child.id), {
            lastActive: serverTimestamp(),
        });

        return session;
    }

    /**
     * Validates an existing session.
     */
    static async validateSession(
        sessionId: string
    ): Promise<{ valid: boolean; session?: ChildSession; child?: Child; error?: string }> {
        try {
            const sessionDoc = await getDoc(doc(db, 'childSessions', sessionId));
            if (!sessionDoc.exists()) {
                return { valid: false, error: 'Session not found' };
            }

            const session = sessionDoc.data() as ChildSession;

            // Check expiry
            if (session.expiresAt.toMillis() < Date.now()) {
                return { valid: false, error: 'Session expired' };
            }

            // Check active status
            if (!session.isActive) {
                return { valid: false, error: 'Session invalidated' };
            }

            // Fetch child
            const childDoc = await getDoc(doc(db, 'children', session.childId));
            if (!childDoc.exists()) {
                return { valid: false, error: 'Child not found' };
            }

            // Update last active
            await updateDoc(doc(db, 'childSessions', sessionId), {
                lastActive: serverTimestamp(),
            });

            return {
                valid: true,
                session,
                child: childDoc.data() as Child,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Validation failed';
            return { valid: false, error: message };
        }
    }

    /**
     * Ends a child session.
     */
    static async endSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await updateDoc(doc(db, 'childSessions', sessionId), {
                isActive: false,
            });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Logout failed';
            return { success: false, error: message };
        }
    }

    /**
     * Sets up a PIN for a child.
     */
    static async setupPin(childId: string, pin: string): Promise<PinSetupResult> {
        // Validate PIN format (4-6 digits)
        if (!/^\d{4,6}$/.test(pin)) {
            return { success: false, error: 'PIN must be 4-6 digits' };
        }

        try {
            const hashedPin = hashPin(pin);
            await updateDoc(doc(db, 'children', childId), {
                pin: hashedPin,
                loginMethod: 'pin',
            });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'PIN setup failed';
            return { success: false, error: message };
        }
    }

    /**
     * Configures avatar-based login for a child.
     */
    static async setupAvatarLogin(childId: string, avatarId: string): Promise<PinSetupResult> {
        try {
            await updateDoc(doc(db, 'children', childId), {
                'avatar.presetId': avatarId,
                loginMethod: 'avatar',
                pin: null, // Remove PIN if switching to avatar login
            });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Avatar setup failed';
            return { success: false, error: message };
        }
    }
}

// Export singleton-style functions
export const loginChildWithPin = ChildSessionManager.loginWithPin.bind(ChildSessionManager);
export const loginChildWithAvatar = ChildSessionManager.loginWithAvatar.bind(ChildSessionManager);
export const loginChildWithQR = ChildSessionManager.loginWithQRToken.bind(ChildSessionManager);
export const generateQRToken = ChildSessionManager.generateQRToken.bind(ChildSessionManager);
export const validateChildSession = ChildSessionManager.validateSession.bind(ChildSessionManager);
export const endChildSession = ChildSessionManager.endSession.bind(ChildSessionManager);
export const setupChildPin = ChildSessionManager.setupPin.bind(ChildSessionManager);
