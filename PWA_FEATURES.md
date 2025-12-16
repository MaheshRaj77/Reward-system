# PWA Features - Family Rewards System

## Overview

The Family Rewards app now has full Progressive Web App (PWA) capabilities with offline support, family code storage, and child data caching.

## Features Implemented

### 1. **Family Code Storage (IndexedDB)**

- Family codes are now stored in IndexedDB with automatic fallback to localStorage
- Secure, persistent storage on the device
- Data survives app uninstalls and browser updates
- Supports offline access to family code

### 2. **Child Data Caching**

- All children data is automatically cached to IndexedDB when parents view the children page
- Cached data includes:
  - Child name, avatar, age group
  - Star balances
  - Streak information
- Enables offline browsing of family members
- Auto-updates when online

### 3. **App Installation**

- PWA banner prompts users to install the app on their device
- One-click installation button
- Works on all platforms (iOS, Android, Windows, Mac)
- Offline-first experience

### 4. **Offline Sync Queue**

- Operations queued when offline
- Automatic sync when connectivity returns
- No data loss during offline periods

## Architecture

### Core Files

#### `/src/lib/pwa/storage.ts`

Manages IndexedDB operations:

- `initDB()` - Initialize the database
- `saveFamilyCode()` - Store family code with ID
- `getFamilyCode()` - Retrieve stored family code
- `saveChildren()` - Cache children data
- `getChildren()` - Retrieve cached children
- `addToSyncQueue()` - Queue operations for sync
- `getSyncQueue()` - Retrieve pending operations

#### `/src/lib/hooks/use-pwa.tsx`

React hook that provides:

- PWA installation management
- Family code CRUD operations via IndexedDB
- Children data caching
- Service worker registration
- Offline detection and sync

#### `/src/components/pwa-provider.tsx`

Provider component that:

- Wraps the app to provide PWA context
- Shows installation banners
- Manages family code dialog
- Handles user interactions

#### `/src/components/pwa/index.tsx`

UI Components:

- `InstallAppButton` - Button to install PWA
- `FamilyCodeDialog` - Dialog for entering/displaying family codes
- `InstallPromptBanner` - Banner to prompt installation

## Usage

### For Parents

#### 1. Install the App

```
1. Visit the app on mobile/desktop
2. See the installation banner
3. Click "Install" button
4. App is saved to home screen
```

#### 2. Family Code

```
1. Go to /children page
2. Family code displays at top
3. Share code with children
4. Code is automatically stored locally
```

### For Children

#### 1. Install the App

```
1. Receive family code from parent
2. Open app on mobile/desktop
3. Click "Install" button
4. Enter family code in prompt
5. Code is saved locally
```

#### 2. Access Family Data

```
1. View all siblings and their progress
2. Access data even without internet
3. Cached data updates when online
```

## Technical Details

### IndexedDB Schema

#### Family Code Store

```typescript
{
  id: 'current',
  code: 'ABC12345',
  familyId: 'family_xxxxx',
  savedAt: '2025-12-15T...'
}
```

#### Children Store

```typescript
{
  id: 'child_id',
  name: 'Emma',
  avatar: { presetId: 'lion', backgroundColor: '#...' },
  starBalances: { growth: 150 },
  streaks: { currentStreak: 7, longestStreak: 14 },
  ageGroup: '7-10',
  familyId: 'family_xxxxx',
  cachedAt: '2025-12-15T...'
}
```

#### Sync Queue Store

```typescript
{
  id: 1,
  type: 'update' | 'create' | 'delete',
  collection: 'children',
  data: { ...operation data },
  timestamp: '2025-12-15T...'
}
```

### Service Worker

- Located at `/public/sw.js`
- Caches static assets and API responses
- Enables offline-first experience
- Auto-updates when new version deployed

## API Reference

### usePWA Hook

```typescript
const {
  // Installation
  canInstall: boolean,
  isInstalled: boolean,
  installApp: () => Promise<void>,

  // Family Code
  familyCode: string | null,
  saveFamilyCode: (code: string, familyId?: string) => Promise<string>,
  getFamilyCode: () => Promise<string | null>,

  // Children Caching
  cacheChildren: (children: any[]) => Promise<void>,
  getCachedChildren: (familyId?: string) => Promise<any[]>,

  // Dialogs
  showFamilyCodePrompt: boolean,
  setShowFamilyCodePrompt: (show: boolean) => void,

  // Logout
  logout: () => Promise<void>,
  clearFamilyCode: () => Promise<void>,

  // State
  hydrated: boolean
} = usePWA();
```

### Storage Functions

```typescript
// Family Code
await saveFamilyCode(code, familyId);
const code = await getFamilyCode();

// Children
await saveChildren(childrenArray);
const children = await getChildren(familyId);
const child = await getChild(childId);

// Sync Queue
await addToSyncQueue({ type, collection, data });
const queue = await getSyncQueue();
await removeSyncQueueItem(id);

// Clear All
await clearAllData();
```

## Best Practices

### 1. Always Check Hydration

```typescript
const { hydrated } = usePWA();
if (!hydrated) return <Spinner />;
```

### 2. Error Handling

```typescript
try {
  await saveFamilyCode(code);
} catch (error) {
  console.error("Failed to save:", error);
  // App still works - localStorage fallback
}
```

### 3. Cache Management

```typescript
// Cache when data updates
const handleChildrenUpdate = async (children) => {
  setChildren(children);
  await cacheChildren(children);
};
```

### 4. Offline Detection

```typescript
useEffect(() => {
  const handleOnline = async () => {
    // Sync queued operations
    const queue = await getSyncQueue();
    // ... process queue
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}, []);
```

## Compatibility

- **iOS**: 15+ (Home Screen Web App)
- **Android**: 5+ (Chrome, Firefox, etc.)
- **Desktop**: Windows 11+, macOS, Linux
- **Browsers**: Chrome, Edge, Firefox, Safari

## Troubleshooting

### Family Code Not Saving

1. Check browser console for errors
2. Verify IndexedDB is enabled
3. Check localStorage as fallback
4. Clear browser data and retry

### Children Not Caching

1. Ensure kids data is loaded
2. Check IndexedDB quota
3. Verify page has network access
4. Check browser console for errors

### Service Worker Not Updating

1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check `/public/sw.js` is deployed
4. Verify manifest.json exists

## Future Enhancements

- [ ] Selective sync for specific children
- [ ] Offline task creation/completion
- [ ] Push notifications for achievements
- [ ] Background sync for rewards
- [ ] Biometric unlock for app
- [ ] Data export/import
- [ ] Multi-device sync with cloud backup

## Files Modified

- `/src/lib/pwa/storage.ts` - New file
- `/src/lib/hooks/use-pwa.tsx` - Updated with IndexedDB
- `/src/components/pwa-provider.tsx` - Enhanced provider
- `/src/components/pwa/index.tsx` - Updated UI components
- `/src/app/children/page.tsx` - Added caching

## Questions?

Check:

1. PWA_IMPLEMENTATION.md - General PWA setup
2. PWA_QUICK_START.md - Quick start guide
3. Browser DevTools > Application > Storage for IndexedDB inspection
