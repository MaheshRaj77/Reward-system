import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ParentUser, COLLECTIONS, DEFAULT_NOTIFICATIONS } from './types';

export interface IParentService {
    getParent(userId: string): Promise<ParentUser | null>;
    createParent(userId: string, mobileNumber: string): Promise<ParentUser>;
    updateParent(userId: string, data: Partial<ParentUser>): Promise<void>;
    completeProfile(userId: string, name: string, email: string): Promise<{ success: boolean; error?: string }>;
    verifyEmail(userId: string): Promise<{ success: boolean; error?: string }>;
    updateNotification(userId: string, type: keyof typeof DEFAULT_NOTIFICATIONS, enabled: boolean): Promise<{ success: boolean; error?: string }>;
}

export class ParentService implements IParentService {

    async getParent(userId: string): Promise<ParentUser | null> {
        try {
            const docRef = doc(db, COLLECTIONS.PARENTS, userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as ParentUser;
                // Migration: ensure notifications object exists
                if (!data.notifications) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const oldData = data as any;
                    data.notifications = {
                        email: oldData.emailNotifications ?? false,
                        sms: false,
                        whatsapp: false,
                        push: false,
                    };
                }
                return data;
            }
            return null;
        } catch (error) {
            console.error('[ParentService] Error getting parent:', error);
            return null;
        }
    }

    async createParent(userId: string, mobileNumber: string): Promise<ParentUser> {
        const now = Timestamp.now();

        const parent: ParentUser = {
            id: userId,
            mobileNumber,
            name: '',
            email: '',
            isProfileComplete: false,
            isEmailVerified: false,
            notifications: { ...DEFAULT_NOTIFICATIONS },
            createdAt: now,
            updatedAt: now,
        };

        await setDoc(doc(db, COLLECTIONS.PARENTS, userId), parent);
        console.log(`[ParentService] Created parent: ${userId}`);

        return parent;
    }

    async updateParent(userId: string, data: Partial<ParentUser>): Promise<void> {
        const docRef = doc(db, COLLECTIONS.PARENTS, userId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
        console.log(`[ParentService] Updated parent: ${userId}`);
    }

    async completeProfile(userId: string, name: string, email: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.updateParent(userId, {
                name,
                email,
                isProfileComplete: true,
            });

            console.log(`[ParentService] Profile completed for: ${userId}`);
            return { success: true };
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to complete profile';
            console.error('[ParentService] Error completing profile:', error);
            return { success: false, error: errMsg };
        }
    }

    async verifyEmail(userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.updateParent(userId, {
                isEmailVerified: true,
            });

            console.log(`[ParentService] Email verified for: ${userId}`);
            return { success: true };
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to verify email';
            console.error('[ParentService] Error verifying email:', error);
            return { success: false, error: errMsg };
        }
    }

    async updateNotification(
        userId: string,
        type: keyof typeof DEFAULT_NOTIFICATIONS,
        enabled: boolean
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const docRef = doc(db, COLLECTIONS.PARENTS, userId);
            await updateDoc(docRef, {
                [`notifications.${type}`]: enabled,
                updatedAt: Timestamp.now(),
            });

            console.log(`[ParentService] ${type} notifications ${enabled ? 'enabled' : 'disabled'} for: ${userId}`);
            return { success: true };
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to update notification settings';
            console.error('[ParentService] Error setting notifications:', error);
            return { success: false, error: errMsg };
        }
    }
}

export const parentService = new ParentService();
