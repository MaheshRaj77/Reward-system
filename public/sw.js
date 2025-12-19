// Service Worker for Family Rewards PWA
// Handles PWA caching, Firebase Cloud Messaging, and push notifications

// Import Firebase compat libraries (v10)
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

console.log('[sw.js] Firebase compat libraries imported');

// Initialize Firebase in the service worker
try {
    firebase.initializeApp({
        apiKey: "AIzaSyCisfeZ1QPXI0gdrkfvEYwDYxqPyVnALrQ",
        authDomain: "reward-f4a41.firebaseapp.com",
        projectId: "reward-f4a41",
        storageBucket: "reward-f4a41.firebasestorage.app",
        messagingSenderId: "744191183124",
        appId: "1:744191183124:web:b398727c40f92829471a01",
        measurementId: "G-XME0DYK7YK"
    });
    console.log('[sw.js] Firebase initialized successfully');
} catch (e) {
    console.error('[sw.js] Failed to initialize Firebase:', e);
}

const messaging = firebase.messaging();
console.log('[sw.js] Firebase Messaging instance created');

const CACHE_NAME = 'family-rewards-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // It's ok if some files aren't available yet
        console.log('Some files could not be cached during install');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Return cached version if network request fails
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - Page not available in cache', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Firebase Cloud Messaging - Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log('[sw.js] FCM Background message received:', payload);

    var notificationTitle = payload.notification && payload.notification.title ? payload.notification.title : 'Family Rewards';
    var notificationOptions = {
        body: payload.notification && payload.notification.body ? payload.notification.body : 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data || {},
        vibrate: [200, 100, 200],
        tag: 'family-rewards-notification',
        renotify: true,
        requireInteraction: true
    };

    console.log('[sw.js] Showing notification:', notificationTitle);
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Legacy push notification event (fallback for non-FCM push events)
self.addEventListener('push', (event) => {
  console.log('[sw.js] Push event received (non-FCM):', event);

  let notificationData = {
    title: 'Family Rewards',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/dashboard' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.notification?.title || data.title || notificationData.title,
        body: data.notification?.body || data.body || notificationData.body,
        icon: data.notification?.icon || data.icon || notificationData.icon,
        badge: notificationData.badge,
        data: {
          url: data.data?.url || data.fcmOptions?.link || '/approvals',
          ...data.data
        }
      };
    } catch (e) {
      console.error('[sw.js] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      tag: 'family-rewards-notification',
      renotify: true,
      requireInteraction: true
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked:', event);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/approvals';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[sw.js] Focusing existing window');
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open a new window if none exists
      console.log('[sw.js] Opening new window:', targetUrl);
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

