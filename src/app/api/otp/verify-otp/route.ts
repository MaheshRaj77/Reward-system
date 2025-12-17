import { NextRequest, NextResponse } from 'next/server';
import { otpService } from '@/modules/auth/otp.service';
import { mobileAuthService } from '@/modules/auth/mobile-auth.service';

export async function POST(request: NextRequest) {
    try {
        const { phoneNumber, code } = await request.json();

        if (!phoneNumber || !code) {
            return NextResponse.json(
                { success: false, error: 'Phone number and code are required' },
                { status: 400 }
            );
        }

        // 1. Verify OTP
        const verifyResult = await otpService.verifyOtp(phoneNumber, code);

        // Debug log
        console.log('Verify Result:', verifyResult);

        if (!verifyResult.success || !verifyResult.valid) {
            return NextResponse.json({
                success: false,
                valid: false,
                error: verifyResult.error || 'Invalid OTP'
            });
        }

        // 2. Authenticate User (Create session/cookie logic would ideally go here or be handled by client)
        // Since we are moving to a model where the Client handles the Firebase Login call *after* verification,
        // we can either return success here and let client do the login, OR do the login here.

        // However, `mobileAuthService` uses `loginParent` which uses Firebase Client SDK (`getAuth(app)`).
        // This won't work on the server side (API Route). Firebase Client SDK needs to run in the browser.
        // So for now, we will return success and allow the client to proceed.
        //
        // WAIT: The previous plan said "Implement Mobile-Deterministic Auth Strategy" in `src/modules/auth/mobile-auth.service.ts`.
        // And I implemented it importing `@/lib/auth/parent-auth`.
        // If `@/lib/auth/parent-auth` depends on `firebase/auth` (client sdk), it will fail in this Node API route.
        //
        // Let's verify `src/lib/auth/parent-auth.ts`. It imports `getAuth(app)`.
        // So `MobileAuthService` CANNOT be used in this API route directly if it uses client SDK.

        // CORRECTION: The client UI should call `mobileAuthService` directly (since it's client code),
        // or we need a server-admin version.
        // Given the requirement "make this dedicated module", the module can be isomorphic or shared.
        // `OtpService` is server-side (secrets).
        // `MobileAuthService` is client-side (uses Firebase Client SDK).

        // So checking the plan: "Refactor API Routes to use Auth Module".
        // The API route currently only does OTP verification. It returns `valid: true`.
        // The Login Page then proceeds. 
        // 
        // So for this API route, we just verify OTP. The logging in happens on the client using `MobileAuthService`.

        return NextResponse.json({
            success: true,
            valid: true,
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to verify OTP' },
            { status: 500 }
        );
    }
}
