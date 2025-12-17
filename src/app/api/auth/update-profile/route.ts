import { NextResponse } from 'next/server';
import { profileService } from '@/modules/auth/profile.service';

export async function POST(request: Request) {
    try {
        const { userId, name, email } = await request.json();

        if (!userId || !name || !email) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const result = await profileService.updateProfile(userId, name, email);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    } catch (error: any) {
        console.error('[API UpdateProfile] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }
}
