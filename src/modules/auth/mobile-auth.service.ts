import { IAuthService, AuthResult } from './types';
import { parentService } from '@/modules/parent';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

// Secret for deterministic password generation
const MOBILE_AUTH_SECRET = process.env.MOBILE_AUTH_SECRET || 'pinmbo-mobile-auth-secret-v1';

export class MobileAuthService implements IAuthService {

    private generateCredentials(phoneNumber: string) {
        // Remove spaces and ensure + prefix
        let cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (!cleanPhone.startsWith('+')) cleanPhone = `+91${cleanPhone}`;

        // Deterministic email based on phone
        const email = `${cleanPhone.replace('+', '')}@pinmbo.local`;

        // Deterministic password
        const password = `Pwd#${cleanPhone}#${MOBILE_AUTH_SECRET}`;

        return { email, password, cleanPhone };
    }

    async authenticateWithMobile(phoneNumber: string): Promise<AuthResult> {
        const { email, password, cleanPhone } = this.generateCredentials(phoneNumber);

        try {
            // Ensure persistence
            await setPersistence(auth, browserLocalPersistence);

            // 1. Try to Login
            try {
                const credential = await signInWithEmailAndPassword(auth, email, password);
                const user = credential.user;

                // Get parent data from new parents collection
                let parent = await parentService.getParent(user.uid);

                if (parent) {
                    // If parent exists but mobileNumber is missing, update it
                    if (!parent.mobileNumber) {
                        await parentService.updateParent(user.uid, { mobileNumber: cleanPhone });
                        parent = { ...parent, mobileNumber: cleanPhone };
                        console.log(`[MobileAuth] Updated missing mobileNumber for: ${cleanPhone}`);
                    }

                    console.log(`[MobileAuth] Login successful for: ${cleanPhone}`);
                    return {
                        success: true,
                        parent,
                        isNewUser: false
                    };
                }
            } catch (loginError: any) {
                // Login failed, user might not exist
                console.log(`[MobileAuth] Login failed, attempting registration...`);
            }

            // 2. Register new user
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            const user = credential.user;

            // Create parent in new collection
            const parent = await parentService.createParent(user.uid, cleanPhone);

            console.log(`[MobileAuth] Registration successful for: ${cleanPhone}`);
            return {
                success: true,
                parent,
                isNewUser: true
            };

        } catch (error: any) {
            console.error('[MobileAuth] Error:', error);

            // Handle specific errors
            if (error.code === 'auth/email-already-in-use') {
                // User exists but login failed - might be wrong password
                return { success: false, error: 'Account exists but authentication failed.' };
            }

            return {
                success: false,
                error: error.message || 'An unexpected error occurred'
            };
        }
    }
}

export const mobileAuthService = new MobileAuthService();
