/**
 * Hook for PWA installation and family code management
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const FAMILY_CODE_STORAGE_KEY = 'family_code';
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
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
    }
  }, []);

  // Check for installed status
  useEffect(() => {
    const checkInstallation = () => {
      const installed = localStorage.getItem(APP_INSTALLED_KEY) === 'true';
      const savedFamilyCode = localStorage.getItem(FAMILY_CODE_STORAGE_KEY);
      
      setIsInstalled(installed);
      setFamilyCode(savedFamilyCode);

      // Show family code prompt if app is installed but no code saved
      if (installed && !savedFamilyCode) {
        setShowFamilyCodePrompt(true);
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
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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

  const saveFamilyCode = useCallback((code: string) => {
    const sanitized = code.toUpperCase().trim();
    localStorage.setItem(FAMILY_CODE_STORAGE_KEY, sanitized);
    setFamilyCode(sanitized);
    setShowFamilyCodePrompt(false);
    return sanitized;
  }, []);

  const getFamilyCode = useCallback(() => {
    return localStorage.getItem(FAMILY_CODE_STORAGE_KEY);
  }, []);

  const clearFamilyCode = useCallback(() => {
    localStorage.removeItem(FAMILY_CODE_STORAGE_KEY);
    setFamilyCode(null);
  }, []);

  return {
    canInstall,
    isInstalled,
    familyCode,
    showFamilyCodePrompt,
    setShowFamilyCodePrompt,
    installApp,
    saveFamilyCode,
    getFamilyCode,
    clearFamilyCode,
    hydrated,
  };
}
