// Firebase Messaging Service Worker
// This file handles background push notifications

// Use Firebase compat libraries (v10)
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyCisfeZ1QPXI0gdrkfvEYwDYxqPyVnALrQ",
    authDomain: "reward-f4a41.firebaseapp.com",
    projectId: "reward-f4a41",
    storageBucket: "reward-f4a41.firebasestorage.app",
    messagingSenderId: "744191183124",
    appId: "1:744191183124:web:b398727c40f92829471a01",
    measurementId: "G-XME0DYK7YK"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    var notificationTitle = payload.notification && payload.notification.title ? payload.notification.title : 'Family Rewards';
    var notificationOptions = {
        body: payload.notification && payload.notification.body ? payload.notification.body : 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data || {},
        vibrate: [200, 100, 200],
        tag: 'family-rewards-notification',
        renotify: true
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);
    event.notification.close();

    var targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/approvals';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
