# PWA Integration Examples

## Complete Integration Guide

### Example 1: Using PWA in a Component

```tsx
"use client";

import { usePWA } from "@/lib/hooks/use-pwa";
import { PWAProvider } from "@/components/pwa-provider";

function MyDashboard() {
  const {
    canInstall,
    isInstalled,
    familyCode,
    installApp,
    saveFamilyCode,
    getFamilyCode,
  } = usePWA();

  return (
    <div>
      {/* Show install button if available */}
      {canInstall && (
        <button
          onClick={installApp}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          📱 Install App
        </button>
      )}

      {/* Show installation status */}
      {isInstalled && <p className="text-green-600">✓ App installed</p>}

      {/* Display saved family code */}
      {familyCode && (
        <div className="p-4 bg-gray-100 rounded">
          <p className="font-bold">Family Code: {familyCode}</p>
        </div>
      )}

      {/* Save new family code */}
      <button onClick={() => saveFamilyCode("NEWCODE123")}>Update Code</button>
    </div>
  );
}
```

### Example 2: Wrapping a Page with PWA Provider

```tsx
// src/app/dashboard/page.tsx

import { PWAProvider } from "@/components/pwa-provider";

export default function DashboardPage() {
  return (
    <PWAProvider showBanner={true} showButtonInHeader={false}>
      <div className="min-h-screen">
        <header>
          <h1>Family Rewards Dashboard</h1>
        </header>

        <main>{/* Your dashboard content */}</main>
      </div>
    </PWAProvider>
  );
}
```

### Example 3: Custom Family Code Dialog

```tsx
"use client";

import { useState } from "react";
import { usePWA } from "@/lib/hooks/use-pwa";

export function FamilyCodeManager() {
  const { familyCode, saveFamilyCode, clearFamilyCode } = usePWA();
  const [code, setCode] = useState("");

  const handleSave = () => {
    const saved = saveFamilyCode(code);
    console.log(`Family code saved: ${saved}`);
    setCode("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">Saved Family Code</h3>
        {familyCode ? (
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-4 py-2 rounded">{familyCode}</code>
            <button
              onClick={clearFamilyCode}
              className="text-red-600 hover:text-red-700"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-gray-500">No code saved</p>
        )}
      </div>

      <div>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter family code"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <button
          onClick={handleSave}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Save Code
        </button>
      </div>
    </div>
  );
}
```

### Example 4: Conditional Rendering Based on Installation

```tsx
"use client";

import { usePWA } from "@/lib/hooks/use-pwa";

export function AppStatus() {
  const { canInstall, isInstalled, installApp } = usePWA();

  if (isInstalled) {
    return (
      <div className="bg-green-100 border border-green-400 p-4 rounded">
        <h3 className="font-bold text-green-800">App Ready</h3>
        <p className="text-green-700">
          The app is installed and ready to use offline.
        </p>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div className="bg-blue-100 border border-blue-400 p-4 rounded">
        <h3 className="font-bold text-blue-800">Install Available</h3>
        <p className="text-blue-700">
          You can install this app on your device for offline access.
        </p>
        <button
          onClick={installApp}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Install Now
        </button>
      </div>
    );
  }

  return null;
}
```

### Example 5: Checking Family Code Before Proceeding

```tsx
"use client";

import { usePWA } from "@/lib/hooks/use-pwa";

export function ProtectedContent() {
  const { familyCode, showFamilyCodePrompt, setShowFamilyCodePrompt } =
    usePWA();

  if (!familyCode) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Family Code Required</h2>
        <p className="text-gray-600 mb-6">
          Please enter your family code to access this content.
        </p>
        <button
          onClick={() => setShowFamilyCodePrompt(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
        >
          Enter Family Code
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4">Family Code: {familyCode}</p>
      {/* Your protected content */}
    </div>
  );
}
```

### Example 6: Complete Child List Page Integration

```tsx
"use client";

import { useEffect, useState } from "react";
import { PWAProvider } from "@/components/pwa-provider";
import { usePWA } from "@/lib/hooks/use-pwa";

export default function ChildrenPage() {
  return (
    <PWAProvider showBanner={true} showButtonInHeader={false}>
      <ChildrenContent />
    </PWAProvider>
  );
}

function ChildrenContent() {
  const { canInstall, isInstalled, familyCode, installApp } = usePWA();
  const [children, setChildren] = useState([]);

  useEffect(() => {
    // Load children data
    // Use familyCode to filter if needed
    if (familyCode) {
      // Load children for this family code
    }
  }, [familyCode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1>👨‍👩‍👧‍👦 Children</h1>

          {canInstall && (
            <button
              onClick={installApp}
              className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
            >
              <span>📱</span>
              Install App
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Family Code Display */}
        {familyCode && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-8">
            <h3 className="font-bold text-gray-800">Family Code</h3>
            <p className="text-2xl font-mono font-bold text-indigo-600 mt-2">
              {familyCode}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Share with children - they use this to log in
            </p>
          </div>
        )}

        {/* Children List */}
        <div className="space-y-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition"
            >
              <h3 className="font-bold">{child.name}</h3>
              <p className="text-sm text-gray-600">
                ⭐ {child.stars} · 🔥 {child.streak}
              </p>
            </div>
          ))}
        </div>

        {children.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No children yet</p>
          </div>
        )}
      </main>
    </div>
  );
}
```

## Hook API Reference

### `usePWA()` Returns:

```typescript
{
  // Status
  canInstall: boolean;                    // Can install app
  isInstalled: boolean;                   // App is installed

  // Family Code
  familyCode: string | null;              // Saved family code
  showFamilyCodePrompt: boolean;          // Show code dialog

  // Methods
  installApp: () => Promise<void>;        // Trigger installation
  saveFamilyCode: (code: string) => string;  // Save code
  getFamilyCode: () => string | null;     // Get saved code
  clearFamilyCode: () => void;            // Clear code
  setShowFamilyCodePrompt: (show: boolean) => void;  // Control dialog
}
```

## PWAProvider Props

```typescript
{
  children: React.ReactNode;              // Content to wrap
  showBanner?: boolean;                   // Show install banner
  showButtonInHeader?: boolean;           // Show install in header
}
```

## Common Patterns

### Pattern 1: Require Family Code

```tsx
if (!familyCode) {
  return <FamilyCodePrompt onSave={saveFamilyCode} />;
}
```

### Pattern 2: Auto-Install

```tsx
useEffect(() => {
  if (canInstall && autoInstall) {
    installApp();
  }
}, [canInstall, autoInstall, installApp]);
```

### Pattern 3: Family Code in URL/API Calls

```tsx
const { familyCode } = usePWA();

const loadData = async () => {
  const response = await fetch(`/api/family/${familyCode}/children`);
  return response.json();
};
```

## Troubleshooting

### Family Code Not Saving

- Check if localStorage is enabled
- Verify no privacy mode/incognito
- Check browser console for errors

### Install Button Not Showing

- Ensure HTTPS (required for service workers)
- Check browser supports PWA
- Try different browser
- Clear cache and reload

### Service Worker Not Registering

- Check `/public/sw.js` exists
- Verify HTTPS connection
- Look for errors in console
- Try different browser

## Testing Checklist

- [ ] Install button appears on desktop
- [ ] Family code dialog shows on first open
- [ ] Family code persists on reload
- [ ] App installs to home screen (mobile)
- [ ] App runs in standalone mode when installed
- [ ] Offline functionality works
- [ ] Service worker appears in DevTools
- [ ] localStorage keys are set correctly
