# PWA & Family Code Persistence Implementation

## Overview

This implementation adds Progressive Web App (PWA) capabilities and family code persistence to the Family Rewards system, allowing the app to be installed on devices and automatically remember family codes.

## Features Implemented

### 1. **PWA Installation**

- Users can install the app on their device (iOS, Android, Windows, macOS)
- App works offline with cached content
- Appears as a native application on home screens
- Custom app name, colors, and icons

### 2. **Family Code Persistence**

- Family code is saved to device localStorage on first use
- Parents no longer need to enter the code every time they open the app
- Family code is displayed in the children list page
- Easy to share with children

### 3. **Install Prompt**

- Shows an installation banner when the app is installable
- Includes "Install" and "Dismiss" buttons
- Also shows as a link in the header (📱 Install App)
- Automatically hides after dismissal

### 4. **Family Code Entry Dialog**

- Shows when app is first installed or opened
- Requires family code to be entered
- Validates input (minimum 4 characters)
- Shows helpful tips to users

## Files Created

### 1. **Public Assets**

```
public/
├── manifest.json              # PWA manifest configuration
├── sw.js                      # Service worker for offline support
├── icon-192.png              # App icon (192x192)
├── icon-512.png              # App icon (512x512)
├── icon-192-maskable.png     # Maskable icon (adaptive icons)
├── icon-512-maskable.png     # Maskable icon (adaptive icons)
├── screenshot-1.png          # App screenshot (mobile)
└── screenshot-2.png          # App screenshot (desktop)
```

### 2. **React Hooks**

- `src/lib/hooks/use-pwa.tsx` - Main PWA hook handling:
  - Service worker registration
  - Installation prompt detection
  - Family code persistence
  - App installation status tracking

### 3. **Components**

- `src/components/pwa/index.tsx` - UI components:
  - `InstallAppButton` - Button to trigger installation
  - `FamilyCodeDialog` - Dialog for entering family code
  - `InstallPromptBanner` - Banner showing install option
- `src/components/pwa-provider.tsx` - Provider component wrapping pages with PWA functionality

### 4. **Updated Files**

- `src/app/layout.tsx` - Added PWA metadata and manifest link
- `src/app/children/page.tsx` - Integrated PWA provider and install button
- `src/lib/hooks/index.ts` - Exported new `use-pwa` hook

## How It Works

### User Flow - First Time (Parent)

1. **App Opens**

   - Service worker registers (if available)
   - Checks localStorage for saved family code
   - If no code: shows FamilyCodeDialog

2. **Enter Family Code**

   - Parent enters their family code
   - Code is validated (non-empty, min 4 chars)
   - Code is saved to localStorage
   - Dialog closes

3. **Install Prompt Appears**

   - Browser shows beforeinstallprompt event
   - App shows InstallPromptBanner
   - User can click "Install" or "Dismiss"

4. **App Installed**
   - User clicks Install
   - App is added to home screen
   - App runs in standalone mode
   - Family code already saved

### User Flow - Subsequent Opens

1. **App Opens** (from home screen or browser)
2. **Auto-Loads Family Code** from localStorage
3. **Shows Children List** with family code displayed
4. **Install Button Hidden** (already installed)

## Local Storage Keys

```javascript
FAMILY_CODE_STORAGE_KEY = "family_code"; // Stores family code
APP_INSTALLED_KEY = "app_installed"; // Tracks installation status
```

## Service Worker Features

### Caching Strategy: Network First

1. Tries to fetch from network first
2. Falls back to cache if offline
3. Automatically caches successful responses
4. Shows "Offline" message if resource unavailable

### Cached URLs

- `/`
- `/index.html`
- `/manifest.json`

## Browser Support

| Browser | Desktop      | Mobile       |
| ------- | ------------ | ------------ |
| Chrome  | ✅           | ✅           |
| Edge    | ✅           | ✅           |
| Firefox | ✅ (partial) | ✅ (partial) |
| Safari  | ⚠️           | ✅           |
| Opera   | ✅           | ✅           |

## Integration Points

### In Children Page

```tsx
<PWAProvider showBanner={true} showButtonInHeader={false}>
  <ChildrenPageContent ... />
</PWAProvider>
```

### Using PWA Hook

```tsx
const {
  canInstall,
  isInstalled,
  familyCode,
  showFamilyCodePrompt,
  setShowFamilyCodePrompt,
  installApp,
  saveFamilyCode,
  getFamilyCode,
  clearFamilyCode,
} = usePWA();
```

## Usage Examples

### Get Saved Family Code

```tsx
const familyCode = getFamilyCode(); // Returns 'FAM123ABC' or null
```

### Save New Family Code

```tsx
const code = saveFamilyCode("NewCode123"); // Saves and returns sanitized code
```

### Trigger Installation

```tsx
if (canInstall) {
  await installApp(); // Shows installation prompt
}
```

## Configuration

### PWA Metadata (manifest.json)

- **name**: Full app name
- **short_name**: Short name for home screen
- **start_url**: App entry point
- **display**: "standalone" (full-screen app mode)
- **theme_color**: #4f46e5 (Indigo)
- **background_color**: #ffffff (White)

### Shortcuts

The manifest includes shortcuts for quick access:

- "View Children" → `/children`
- "Create Task" → `/tasks/create`

## Security Considerations

1. **localStorage**: Family codes stored unencrypted on device
   - Suitable for home/personal devices
   - Users should not use on shared devices
2. **Service Worker**: Caches public content only

   - No sensitive data cached
   - Cache clears on app updates

3. **Family Code Validation**: Enforced on input
   - Minimum 4 characters
   - Trimmed and uppercased
   - No sensitive operations with invalid codes

## Future Enhancements

1. **Biometric Lock**: Add fingerprint/face auth before showing family code
2. **Push Notifications**: Notify when tasks are completed or approved
3. **Sync in Background**: Sync data when device comes online
4. **Advanced Caching**: Cache more assets for better offline experience
5. **Multiple Profiles**: Support multiple family codes per device
6. **Encryption**: Encrypt stored family code for shared devices

## Testing the PWA

### On Chrome DevTools

1. Open DevTools (F12)
2. Go to Application → Manifest
3. Look for "Install button"
4. On mobile: Long-press app → "Install"

### Verify Service Worker

1. DevTools → Application → Service Workers
2. Should show "sw.js" as active
3. Check "Offline" box to test offline mode

### Check localStorage

1. DevTools → Application → Storage → Local Storage
2. Should show `family_code` and `app_installed` keys

## Troubleshooting

### Install Button Not Showing

- Ensure app is served over HTTPS
- Check browser console for errors
- Try on different browser/device

### Family Code Not Saving

- Check browser's localStorage is enabled
- Verify browser privacy settings allow localStorage
- Clear cache and try again

### Service Worker Not Registering

- Check browser console for registration errors
- Verify `sw.js` is accessible at `/public/sw.js`
- Ensure HTTPS connection (required for service workers)

## Files Checklist

✅ `public/manifest.json` - PWA configuration
✅ `public/sw.js` - Service worker
✅ `public/icon-192.png` - App icon
✅ `public/icon-512.png` - App icon
✅ `public/icon-192-maskable.png` - Maskable icon
✅ `public/icon-512-maskable.png` - Maskable icon
✅ `public/screenshot-1.png` - Mobile screenshot
✅ `public/screenshot-2.png` - Desktop screenshot
✅ `src/lib/hooks/use-pwa.tsx` - PWA hook
✅ `src/components/pwa/index.tsx` - PWA components
✅ `src/components/pwa-provider.tsx` - Provider component
✅ `src/app/layout.tsx` - Updated with PWA metadata
✅ `src/app/children/page.tsx` - Integrated PWA
✅ `src/lib/hooks/index.ts` - Export PWA hook
