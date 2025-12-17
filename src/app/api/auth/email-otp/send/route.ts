import { NextResponse } from 'next/server';
import { emailOtpService } from '@/modules/auth/email-otp.service';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        // Send OTP
        await emailOtpService.sendOtp(email);

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    } catch (error: any) {
        console.error('[API SendEmailOTP] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
    }
}
