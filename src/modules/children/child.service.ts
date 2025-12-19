import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, ChildProfile, ChildSession, CHILD_SESSION_KEY } from './types';

export interface IChildService {
    getChild(childId: string): Promise<ChildProfile | null>;
    getChildrenByParentMobile(mobileNumber: string): Promise<ChildProfile[]>;
    verifyPin(childId: string, pin: string): Promise<{ success: boolean; error?: string }>;
    updateLastActive(childId: string): Promise<void>;
    createSession(child: ChildProfile): ChildSession;
    getSession(): ChildSession | null;
    clearSession(): void;
}

export class ChildService implements IChildService {
    /**
     * Fetch a child profile by ID
     */
    async getChild(childId: string): Promise<ChildProfile | null> {
        try {
            const docRef = doc(db, COLLECTIONS.CHILDREN, childId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as ChildProfile;
            }
            return null;
        } catch (error) {
            console.error('[ChildService] Error getting child:', error);
            return null;
        }
    }

    /**
     * Lookup children by parent's mobile number
     * Flow: mobile -> parent -> family -> children
     */
    async getChildrenByParentMobile(mobileNumber: string): Promise<ChildProfile[]> {
        try {
            // Format mobile number (ensure it has country code)
            let formattedMobile = mobileNumber.replace(/\s+/g, '');
            if (!formattedMobile.startsWith('+')) {
                formattedMobile = `+91${formattedMobile}`;
            }

            // Find parent by mobile number
            const parentsQuery = query(
                collection(db, COLLECTIONS.PARENTS),
                where('mobileNumber', '==', formattedMobile)
            );
            const parentsSnapshot = await getDocs(parentsQuery);

            if (parentsSnapshot.empty) {
                console.log('[ChildService] No parent found with mobile:', formattedMobile);
                return [];
            }

            // Get parent's family ID
            const parentDoc = parentsSnapshot.docs[0];
            const parentData = parentDoc.data();

            // Fallback to parent ID if familyId is missing (for mobile auth users)
            const familyId = parentData.familyId || parentDoc.id;

            if (!familyId) {
                console.log('[ChildService] Parent has no family ID and no ID fallback');
                return [];
            } else if (!parentData.familyId) {
                console.log('[ChildService] Using parent ID as family ID fallback:', familyId);
            }

            // Get children in this family
            const childrenQuery = query(
                collection(db, COLLECTIONS.CHILDREN),
                where('familyId', '==', familyId)
            );
            const childrenSnapshot = await getDocs(childrenQuery);

            const children: ChildProfile[] = [];
            childrenSnapshot.forEach((doc) => {
                children.push({ id: doc.id, ...doc.data() } as ChildProfile);
            });

            console.log(`[ChildService] Found ${children.length} children for mobile:`, formattedMobile);
            return children;
        } catch (error) {
            console.error('[ChildService] Error getting children by mobile:', error);
            return [];
        }
    }

    /**
     * Verify child's PIN
     */
    async verifyPin(childId: string, pin: string): Promise<{ success: boolean; error?: string }> {
        try {
            const child = await this.getChild(childId);

            if (!child) {
                return { success: false, error: 'Child not found' };
            }

            if (child.pin === pin) {
                return { success: true };
            }

            return { success: false, error: 'Wrong PIN. Try again!' };
        } catch (error) {
            console.error('[ChildService] Error verifying PIN:', error);
            return { success: false, error: 'Failed to verify PIN' };
        }
    }

    /**
     * Update child's last active timestamp
     */
    async updateLastActive(childId: string): Promise<void> {
        try {
            const docRef = doc(db, COLLECTIONS.CHILDREN, childId);
            await updateDoc(docRef, {
                lastActive: Timestamp.now(),
            });
        } catch (error) {
            console.error('[ChildService] Error updating last active:', error);
        }
    }

    /**
     * Create a session object for localStorage
     */
    createSession(child: ChildProfile): ChildSession {
        return {
            childId: child.id,
            name: child.name,
            avatar: {
                presetId: child.avatar?.presetId || '',
                backgroundColor: child.avatar?.backgroundColor || '#e0e7ff',
            },
            familyId: child.familyId,
            loginAt: Date.now(),
        };
    }

    /**
     * Get session from localStorage
     */
    getSession(): ChildSession | null {
        if (typeof window === 'undefined') return null;

        try {
            const stored = localStorage.getItem(CHILD_SESSION_KEY);
            if (stored) {
                return JSON.parse(stored) as ChildSession;
            }
        } catch (error) {
            console.error('[ChildService] Error reading session:', error);
        }
        return null;
    }

    /**
     * Clear session from localStorage
     */
    clearSession(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(CHILD_SESSION_KEY);
    }

    /**
     * Save session to localStorage
     */
    saveSession(session: ChildSession): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(CHILD_SESSION_KEY, JSON.stringify(session));
    }
}

export const childService = new ChildService();
