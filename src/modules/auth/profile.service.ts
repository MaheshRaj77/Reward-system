import { getAuth, updateProfile as updateAuthProfile } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { parentService } from '@/modules/parent';

const auth = getAuth(app);

export interface IProfileService {
    updateProfile(userId: string, name: string, email: string): Promise<{ success: boolean; error?: string }>;
}

export class ProfileService implements IProfileService {

    async updateProfile(userId: string, name: string, email: string): Promise<{ success: boolean; error?: string }> {
        try {
            const user = auth.currentUser;
            if (!user) {
                return { success: false, error: 'No authenticated user found' };
            }

            if (user.uid !== userId) {
                return { success: false, error: 'User ID mismatch' };
            }

            // 1. Update Firebase Auth display name
            await updateAuthProfile(user, { displayName: name });

            // 2. Complete profile in parent service (Firestore)
            const result = await parentService.completeProfile(userId, name, email);

            return result;

        } catch (error: any) {
            console.error('[ProfileService] Update failed:', error);
            return { success: false, error: error.message || 'Failed to update profile' };
        }
    }
}

export const profileService = new ProfileService();
