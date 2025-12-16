/**
 * PWA Provider Component
 * Manages installation prompts and family code dialogs with IndexedDB storage
 */
'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '@/lib/hooks/use-pwa';
import { InstallPromptBanner, InstallAppButton, FamilyCodeDialog } from '@/components/pwa';

interface PWAProviderProps {
  children: React.ReactNode;
  showBanner?: boolean;
  showButtonInHeader?: boolean;
}

export function PWAProvider({
  children,
  showBanner = true,
  showButtonInHeader = false,
}: PWAProviderProps) {
  const {
    canInstall,
    isInstalled,
    familyCode,
    showFamilyCodePrompt,
    setShowFamilyCodePrompt,
    installApp,
    saveFamilyCode,
    hydrated,
  } = usePWA();

  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only render PWA UI after hydration is complete
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInstall = async () => {
    await installApp();
  };

  const handleSaveFamilyCode = async (code: string) => {
    try {
      await saveFamilyCode(code);
    } catch (error) {
      console.error('Failed to save family code:', error);
    }
  };

  // During SSR/hydration, render only children to avoid mismatch
  if (!mounted || !hydrated) {
    return <>{children}</>;
  }

  return (
    <>
      {showBanner && canInstall && !dismissedBanner && (
        <InstallPromptBanner
          onInstall={handleInstall}
          onDismiss={() => setDismissedBanner(true)}
        />
      )}

      {showButtonInHeader && canInstall && !dismissedBanner && (
        <div className="flex items-center gap-2">
          <InstallAppButton
            onInstall={handleInstall}
            isInstalled={isInstalled}
            variant="minimal"
          />
        </div>
      )}

      <FamilyCodeDialog
        isOpen={showFamilyCodePrompt}
        onSave={handleSaveFamilyCode}
        onCancel={() => setShowFamilyCodePrompt(false)}
        currentFamilyCode={familyCode}
      />

      {children}
    </>
  );
}
