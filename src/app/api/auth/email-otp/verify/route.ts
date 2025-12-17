import { NextResponse } from 'next/server';
import { emailOtpService } from '@/modules/auth/email-otp.service';

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json({ success: false, error: 'Email and Code are required' }, { status: 400 });
        }

        // Verify OTP
        const isValid = await emailOtpService.verifyOtp(email, code);

        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Invalid or expired OTP' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'OTP verified successfully' });
    } catch (error: any) {
        console.error('[API VerifyEmailOTP] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to verify OTP' }, { status: 500 });
    }
}
