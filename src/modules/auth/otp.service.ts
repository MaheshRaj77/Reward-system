import twilio from 'twilio';
import { IOtpService, OtpResult, VerifyResult } from './types';

const TEST_PHONE_NUMBER = '+919999999999';
const TEST_OTP = '123456';

export class OtpService implements IOtpService {
    private client: twilio.Twilio | null = null;
    private verifyServiceId: string | null = null;

    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.verifyServiceId = process.env.TWILIO_VERIFY_SERVICE_ID || null;

        if (accountSid && authToken) {
            this.client = twilio(accountSid, authToken);
        }
    }

    private formatPhoneNumber(phoneNumber: string): string {
        let formatted = phoneNumber.replace(/\s+/g, '');
        if (!formatted.startsWith('+')) {
            formatted = `+91${formatted}`; // Default to India as per previous logic
        }
        return formatted;
    }

    async sendOtp(phoneNumber: string): Promise<OtpResult> {
        const formattedPhone = this.formatPhoneNumber(phoneNumber);

        // Test Bypass
        if (formattedPhone === TEST_PHONE_NUMBER) {
            console.log(`[OTP Service] Test Number detected: ${formattedPhone}. Skipping Twilio.`);
            return {
                success: true,
                verificationId: 'test-verification-id'
            };
        }

        if (!this.client || !this.verifyServiceId) {
            console.error('[OTP Service] Twilio not configured');
            return { success: false, error: 'OTP service not configured' };
        }

        try {
            const verification = await this.client.verify.v2
                .services(this.verifyServiceId)
                .verifications.create({
                    to: formattedPhone,
                    channel: 'sms',
                });

            return {
                success: true,
                verificationId: verification.sid
            };
        } catch (error: any) {
            console.error('[OTP Service] Error sending OTP:', error);
            return {
                success: false,
                error: error.message || 'Failed to send OTP'
            };
        }
    }

    async verifyOtp(phoneNumber: string, code: string): Promise<VerifyResult> {
        const formattedPhone = this.formatPhoneNumber(phoneNumber);

        // Test Bypass
        if (formattedPhone === TEST_PHONE_NUMBER) {
            if (code === TEST_OTP) {
                return { success: true, valid: true };
            }
            return { success: false, valid: false, error: 'Invalid Test OTP' };
        }

        if (!this.client || !this.verifyServiceId) {
            return { success: false, valid: false, error: 'OTP service not configured' };
        }

        try {
            const verificationCheck = await this.client.verify.v2
                .services(this.verifyServiceId)
                .verificationChecks.create({
                    to: formattedPhone,
                    code: code,
                });

            const isValid = verificationCheck.status === 'approved';

            return {
                success: true,
                valid: isValid,
                error: isValid ? undefined : 'Invalid OTP'
            };
        } catch (error: any) {
            console.error('[OTP Service] Error verifying OTP:', error);
            return {
                success: false,
                valid: false,
                error: error.message || 'Failed to verify OTP'
            };
        }
    }
}

export const otpService = new OtpService();
