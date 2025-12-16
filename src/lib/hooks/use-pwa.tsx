/**
 * Hook for PWA installation and family code management with IndexedDB
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { saveFamilyCode, getFamilyCode, clearAllData, saveChildren, getChildren as getCachedChildren } from '@/lib/pwa/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const APP_INSTALLED_KEY = 'app_installed';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [showFamilyCodePrompt, setShowFamilyCodePrompt] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Initialize service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error);
        });
    } else {
      console.warn('Service Workers not supported');
    }
  }, []);

  // Check for installed status and load cached data
  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const installed = localStorage.getItem(APP_INSTALLED_KEY) === 'true';
        const savedFamilyCode = await getFamilyCode();
        
        setIsInstalled(installed);
        setFamilyCode(savedFamilyCode);

        // Show family code prompt if app is installed but no code saved
        if (installed && !savedFamilyCode) {
          setShowFamilyCodePrompt(true);
        }
      } catch (error) {
        console.error('Error checking installation:', error);
      }
    };

    checkInstallation();

    // Listen for display-mode changes
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      localStorage.setItem(APP_INSTALLED_KEY, 'true');
    }

    // Mark as hydrated after checking browser state
    setHydrated(true);
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('beforeinstallprompt fired - PWA is installable');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('Listening for beforeinstallprompt event...');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem(APP_INSTALLED_KEY, 'true');
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem(APP_INSTALLED_KEY, 'true');
        setIsInstalled(true);
        setShowFamilyCodePrompt(true);
      }
      
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error('Error installing app:', error);
    }
  }, [deferredPrompt]);

  const saveFamilyCodeToStorage = useCallback(async (code: string, familyId?: string) => {
    const sanitized = code.toUpperCase().trim();
    await saveFamilyCode(sanitized, familyId);
    setFamilyCode(sanitized);
    setShowFamilyCodePrompt(false);
    return sanitized;
  }, []);

  const getFamilyCodeFromStorage = useCallback(async () => {
    return await getFamilyCode();
  }, []);

  const cacheChildren = useCallback(async (children: any[]) => {
    await saveChildren(children);
  }, []);

  const getCachedChildrenData = useCallback(async (familyId?: string) => {
    return await getCachedChildren(familyId);
  }, []);

  const logout = useCallback(async () => {
    await clearAllData();
    setFamilyCode(null);
    setShowFamilyCodePrompt(false);
  }, []);

  return {
    canInstall,
    isInstalled,
    familyCode,
    showFamilyCodePrompt,
    setShowFamilyCodePrompt,
    installApp,
    saveFamilyCode: saveFamilyCodeToStorage,
    getFamilyCode: getFamilyCodeFromStorage,
    cacheChildren,
    getCachedChildren: getCachedChildrenData,
    clearFamilyCode: logout,
    logout,
    hydrated,
  };
}
