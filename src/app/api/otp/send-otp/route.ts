import { NextRequest, NextResponse } from 'next/server';
import { otpService } from '@/modules/auth/otp.service';

export async function POST(request: NextRequest) {
    try {
        const { phoneNumber } = await request.json();

        if (!phoneNumber) {
            return NextResponse.json(
                { success: false, error: 'Phone number is required' },
                { status: 400 }
            );
        }

        const result = await otpService.sendOtp(phoneNumber);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            verificationId: result.verificationId,
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to send OTP' },
            { status: 500 }
        );
    }
}
