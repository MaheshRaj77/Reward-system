import { ParentUser } from '@/modules/parent';

// OTP Result types
export interface OtpResult {
    success: boolean;
    verificationId?: string;
    error?: string;
}

export interface VerifyResult {
    success: boolean;
    valid?: boolean;
    error?: string;
}

// Auth Result - now uses ParentUser from parent module
export interface AuthResult {
    success: boolean;
    parent?: ParentUser;
    isNewUser?: boolean;
    error?: string;
}

// OTP Service Interface
export interface IOtpService {
    sendOtp(phoneNumber: string): Promise<OtpResult>;
    verifyOtp(phoneNumber: string, code: string): Promise<VerifyResult>;
}

// Auth Service Interface
export interface IAuthService {
    authenticateWithMobile(phoneNumber: string): Promise<AuthResult>;
}
