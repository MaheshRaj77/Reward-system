import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging } from '@/lib/firebase-admin';

interface NotificationPayload {
    token: string;
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
    url?: string;
}

export async function POST(request: NextRequest) {
    try {
        if (!adminMessaging) {
            return NextResponse.json(
                { success: false, error: 'Firebase Admin not configured' },
                { status: 500 }
            );
        }

        const payload: NotificationPayload = await request.json();
        const { token, title, body, icon, data, url } = payload;

        if (!token || !title || !body) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: token, title, body' },
                { status: 400 }
            );
        }

        const message = {
            token,
            notification: {
                title,
                body,
                ...(icon && { imageUrl: icon }),
            },
            webpush: {
                notification: {
                    title,
                    body,
                    icon: icon || '/icon-192.png',
                    badge: '/icon-192.png',
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: url || '/approvals',
                },
            },
            data: {
                ...data,
                url: url || '/approvals',
                clickAction: url || '/approvals',
            },
        };

        const response = await adminMessaging.send(message);
        console.log('Push notification sent successfully:', response);

        return NextResponse.json({ success: true, messageId: response });
    } catch (error: unknown) {
        console.error('Error sending push notification:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Handle specific FCM errors
        if (errorMessage.includes('not-registered') || errorMessage.includes('invalid-registration-token')) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired token', code: 'TOKEN_INVALID' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
