# Push Notifications Setup & Troubleshooting Guide

## ✅ Fixed Issues

1. **Service Worker Integration**: Now `/public/sw.js` includes Firebase Cloud Messaging handlers
2. **SDK Consistency**: Using Firebase compat SDK v10 consistently
3. **Error Logging**: Added detailed console logging at every step
4. **VAPID Key**: Confirmed present in `.env.local`

## 🔧 How Push Notifications Work (Updated Flow)

```
1. User clicks "Enable Push Notifications" toggle
   ↓
2. Browser prompts for notification permission
   ↓
3. requestNotificationPermission() is called:
   - Initializes Firebase Messaging
   - Registers /sw.js service worker (now with Firebase support)
   - Requests FCM token from Firebase
   ↓
4. Token is sent to Firestore (parentService.saveFcmToken)
   ↓
5. Backend sends push notification via Firebase Admin SDK
   ↓
6. Firebase delivers push to browser via FCM
   ↓
7. Service Worker (/sw.js) receives it:
   - messaging.onBackgroundMessage() handles it
   - Shows notification even when app is closed
   ↓
8. User clicks notification → notificationclick event fires
   → Opens app or brings it to foreground
```

## 🧪 Testing Push Notifications

### Step 1: Check Console Logs

Open DevTools (F12) → Console tab, then toggle "Enable Push Notifications":

Look for these logs in order:

```
📱 Requesting notification permission...
Permission status: granted
✅ Notification permission granted
✅ VAPID key found
📝 Registering service worker at /sw.js...
✅ Service worker registered successfully
⏳ Waiting for service worker to become active...
✅ Service worker is active
🎫 Requesting FCM token...
✅ FCM Token obtained successfully: BW...
[ParentProfile] Token received: BW...
[ParentProfile] Saving FCM token to Firestore...
[ParentProfile] Token saved successfully
[ParentProfile] Updating notification settings...
```

### Step 2: Check Service Worker Status

In DevTools → Application → Service Workers:

- Should see `/sw.js` listed as "activated and running"

### Step 3: Check Firebase Tokens in Firestore

- Go to [Firebase Console](https://console.firebase.google.com)
- Navigate to Firestore → Collections → parents → [your-user-id]
- Look for `fcmToken` field with a long string value
- Check `fcmTokenUpdatedAt` timestamp

### Step 4: Send a Test Push Notification

Use Firebase Admin SDK or Firebase Cloud Messaging REST API:

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/reward-f4a41/messages:send \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "YOUR_FCM_TOKEN_HERE",
      "notification": {
        "title": "Test Notification",
        "body": "If you see this, push notifications work! 🎉"
      },
      "data": {
        "url": "/dashboard"
      }
    }
  }'
```

Or use the Python script in your project:

```bash
python3 scripts/send_push.py --token YOUR_FCM_TOKEN
```

## 🚨 Common Issues & Solutions

### Issue: "Push notifications are not supported in this browser"

**Causes:**

- Browser doesn't support Service Workers (use Chrome, Firefox, Edge)
- Using HTTP instead of HTTPS (except localhost)
- Private/Incognito mode

**Solution:** Use a modern browser on HTTPS

---

### Issue: "Notifications are blocked"

**Causes:**

- User previously denied notification permission
- Browser has blocked notifications for this domain

**Solution:**

1. In Chrome: Settings → Privacy → Site Settings → Notifications
2. Find your domain and change to "Allow"
3. Refresh page and try again

---

### Issue: Token request fails with service worker error

**Causes:**

- Service worker failed to register
- /sw.js file has syntax errors
- Firebase scripts fail to import

**Check in Console:**

```
❌ Service worker registration failed: [error details]
```

**Solution:**

1. Check `/public/sw.js` has no syntax errors
2. Verify Firebase CDN URLs are accessible
3. Check browser's Service Workers tab for errors

---

### Issue: Token is obtained but not saved to Firestore

**Causes:**

- Firestore permissions issue
- Network error
- User not authenticated

**Check:**

1. Verify user is logged in
2. Check Firestore security rules allow writes to `parents/{uid}`
3. Look in console for: `[ParentProfile] Failed to save token: [error]`

---

### Issue: Token saved but no notifications received

**Causes:**

- Notifications toggle not fully enabled
- Backend not sending notifications
- FCM token is invalid/expired

**Check:**

1. Verify toggle shows as enabled (blue)
2. Check backend logs for push notification sends
3. Verify `notifications.push` is `true` in Firestore

---

### Issue: Service Worker receives message but no notification shows

**Check in Console → Application → Service Workers:**

- Click on `/sw.js` → Console tab
- Should see: `[sw.js] FCM Background message received:`

**If not appearing:**

1. Verify `messaging.onBackgroundMessage()` is in `/public/sw.js`
2. Check Firebase imports in sw.js

---

## 📱 Browser Compatibility

| Browser | Support    | HTTPS Only             |
| ------- | ---------- | ---------------------- |
| Chrome  | ✅ Full    | Yes (except localhost) |
| Firefox | ✅ Full    | Yes (except localhost) |
| Safari  | ⚠️ Limited | HTTPS required         |
| Edge    | ✅ Full    | Yes (except localhost) |
| IE 11   | ❌ No      | N/A                    |

## 🔐 Required Permissions

Make sure `firestore.rules` allows:

```firestore
match /parents/{uid} {
  allow read, update: if request.auth.uid == uid;
}
```

## 📋 Files Modified

1. **`/public/sw.js`**

   - Added Firebase Cloud Messaging initialization
   - Added `messaging.onBackgroundMessage()` handler
   - Improved logging with prefixes

2. **`/src/lib/push-notifications.ts`**

   - Added detailed logging at each step
   - Better error messages
   - Explicit VAPID key validation

3. **`/src/modules/parent/ParentProfile.tsx`**
   - Added console logging for debugging
   - More detailed error messages
   - Better error propagation

## ✨ Next Steps

1. Clear browser cache: DevTools → Application → Clear site data
2. Uninstall PWA if installed: DevTools → Application → Manifest
3. Try enabling push notifications
4. Monitor console for detailed logs
5. Check browser's Notifications settings
6. If still not working, share console logs with issue report
