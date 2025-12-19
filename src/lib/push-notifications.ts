// Push Notification Utilities using Firebase Cloud Messaging
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import { app } from './firebase';

let messaging: Messaging | null = null;

// Initialize messaging only in browser
export const initMessaging = (): Messaging | null => {
    if (typeof window === 'undefined') return null;

    if (!messaging) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Failed to initialize Firebase Messaging:', error);
            return null;
        }
    }
    return messaging;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('🔴 Notifications are not supported in this browser');
            return null;
        }

        console.log('📱 Requesting notification permission...');
        
        // Request permission
        const permission = await Notification.requestPermission();
        console.log('Permission status:', permission);

        if (permission !== 'granted') {
            console.warn('🔴 Notification permission denied by user');
            return null;
        }

        console.log('✅ Notification permission granted');

        // Get FCM token
        const messagingInstance = initMessaging();
        if (!messagingInstance) {
            console.error('🔴 Failed to initialize Firebase Messaging');
            return null;
        }

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error('🔴 VAPID key not configured in environment variables');
            return null;
        }

        console.log('✅ VAPID key found');

        // Register service worker for push notifications
        console.log('📝 Registering service worker at /sw.js...');
        let registration: ServiceWorkerRegistration;
        
        try {
            // Register with explicit scope to root
            registration = await navigator.serviceWorker.register('/sw.js', { 
                scope: '/',
                type: 'classic'
            });
            console.log('✅ Service worker registered successfully');
            console.log('Service worker scope:', registration.scope);
        } catch (swError) {
            console.error('🔴 Service worker registration failed:', swError);
            if (swError instanceof Error) {
                console.error('SW Registration error message:', swError.message);
            }
            throw swError;
        }

        // Wait for service worker to be ready/active
        console.log('⏳ Waiting for service worker to become active...');
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker is active');

        // Verify the service worker is actually active
        const controller = navigator.serviceWorker.controller;
        if (!controller) {
            console.warn('⚠️  Service worker controller not found - retrying...');
            // Give it another moment to fully activate
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('🎫 Requesting FCM token...');
        const token = await getToken(messagingInstance, {
            vapidKey,
            serviceWorkerRegistration: registration,
        });

        if (!token) {
            console.error('🔴 Failed to get FCM token');
            return null;
        }

        console.log('✅ FCM Token obtained successfully:', token?.slice(0, 20) + '...');
        return token;
    } catch (error) {
        console.error('🔴 Error getting notification permission:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack:', error.stack);
            
            // Specific error handling for push service errors
            if (error.message.includes('push service')) {
                console.error('🔴 Push service error - Firebase messaging may not be properly configured');
                console.error('Check: 1. Service worker has Firebase messaging imported');
                console.error('       2. VAPID key is valid');
                console.error('       3. Service worker scope matches');
            }
        }
        return null;
    }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: MessagePayload) => void): (() => void) | null => {
    const messagingInstance = initMessaging();
    if (!messagingInstance) return null;

    return onMessage(messagingInstance, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);

        // Show notification manually for foreground messages
        if (payload.notification) {
            const { title, body, icon } = payload.notification;
            if (Notification.permission === 'granted' && title) {
                new Notification(title, {
                    body: body || '',
                    icon: icon || '/icon-192.png',
                    badge: '/icon-192.png',
                    data: payload.data,
                });
            }
        }
    });
};

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get current permission status
export const getNotificationPermission = (): NotificationPermission | null => {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;
    return Notification.permission;
};
