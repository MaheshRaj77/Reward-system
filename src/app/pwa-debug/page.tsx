'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePWA } from '@/lib/hooks/use-pwa';

export default function PWADebugPage() {
  const { canInstall, isInstalled, installApp, familyCode, hydrated } = usePWA();
  const [swRegistered, setSwRegistered] = useState(false);
  const [installPromptStatus, setInstallPromptStatus] = useState('Waiting...');
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkStatus = async () => {
      const info: any = {};

      // Check service worker
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          info.serviceWorkerRegistered = registrations.length > 0;
          setSwRegistered(registrations.length > 0);
        } catch (e) {
          info.serviceWorkerError = (e as Error).message;
        }
      }

      // Check manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      info.manifestLinked = !!manifestLink;

      // Check display mode
      info.displayMode = window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone (installed)'
        : 'browser';

      // Check installed key
      info.appInstalledFlag = localStorage.getItem('app_installed') === 'true';

      // Check HTTPS
      info.isHttps = window.location.protocol === 'https:';
      info.isLocalhost = window.location.hostname === 'localhost';

      // Check beforeinstallprompt capability
      let hasPromptCapability = false;
      const handlePrompt = (e: any) => {
        hasPromptCapability = true;
      };
      window.addEventListener('beforeinstallprompt', handlePrompt);
      setTimeout(() => {
        info.beforeInstallPromptSupported = hasPromptCapability;
        window.removeEventListener('beforeinstallprompt', handlePrompt);
      }, 100);

      setDebugInfo(info);
    };

    if (hydrated) {
      checkStatus();
    }
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">PWA Debug Console</h1>

        {/* Installation Status */}
        <div className="bg-white/60 backdrop-blur-sm border border-indigo-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Installation Status</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Hydrated:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${hydrated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {hydrated ? '✓ Yes' : '⏳ Loading'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Can Install:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${canInstall ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {canInstall ? '✓ Yes' : '✗ No'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Already Installed:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isInstalled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {isInstalled ? '✓ Yes' : '✗ No'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Family Code Saved:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${familyCode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {familyCode ? `✓ ${familyCode}` : '✗ None'}
              </span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white/60 backdrop-blur-sm border border-indigo-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">System Status</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">HTTPS/Localhost:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                (debugInfo.isHttps || debugInfo.isLocalhost) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {debugInfo.isHttps ? 'HTTPS ✓' : debugInfo.isLocalhost ? 'Localhost ✓' : 'HTTP ✗'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Service Worker:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${swRegistered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {swRegistered ? '✓ Registered' : '✗ Not Registered'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Manifest Linked:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${debugInfo.manifestLinked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {debugInfo.manifestLinked ? '✓ Yes' : '✗ No'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Display Mode:</span>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {debugInfo.displayMode}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">beforeinstallprompt:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${debugInfo.beforeInstallPromptSupported ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {debugInfo.beforeInstallPromptSupported ? '✓ Supported' : '⚠ Not Fired'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white/60 backdrop-blur-sm border border-indigo-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>
          
          <div className="space-y-3">
            {canInstall && !isInstalled && (
              <button
                onClick={installApp}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                📱 Install App
              </button>
            )}

            {isInstalled && (
              <div className="px-6 py-3 bg-green-100 border border-green-300 rounded-lg text-green-800 font-semibold">
                ✓ App is already installed
              </div>
            )}

            {!canInstall && !isInstalled && (
              <div className="px-6 py-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 font-semibold">
                ⚠ Install prompt not available yet. This is normal on:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Already installed apps</li>
                  <li>First page load (needs interaction)</li>
                  <li>Some browsers/devices</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Tips to Trigger Install Prompt</h2>
          
          <ol className="list-decimal list-inside space-y-2 text-blue-900">
            <li><strong>Interact first:</strong> Click something on the page, then reload</li>
            <li><strong>Check Chrome DevTools:</strong> Lighthouse tab → PWA Audits</li>
            <li><strong>Visit home page:</strong> Go to <Link href="/" className="underline text-blue-700 hover:text-blue-600">home page</Link> and interact</li>
            <li><strong>Mobile Device:</strong> Test on actual mobile (better support)</li>
            <li><strong>Check Console:</strong> Open DevTools → Console for errors</li>
            <li><strong>Service Worker:</strong> DevTools → Application → Service Workers</li>
            <li><strong>Must be HTTPS:</strong> (or localhost for testing)</li>
            <li><strong>Manifest Valid:</strong> DevTools → Manifest</li>
          </ol>
        </div>

        {/* System Info */}
        <div className="mt-6 bg-gray-900 text-gray-100 rounded-2xl p-6 font-mono text-sm">
          <h2 className="text-lg font-bold mb-4 text-white">Raw Debug Info</h2>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
