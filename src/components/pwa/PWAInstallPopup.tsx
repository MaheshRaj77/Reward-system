'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/lib/hooks/use-pwa';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'pwa_popup_dismissed_at';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function PWAInstallPopup() {
    const { canInstall, installApp, isInstalled, hydrated } = usePWA();
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!hydrated) return;

        // Check if already installed
        if (isInstalled) {
            setIsVisible(false);
            return;
        }

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            if (Date.now() - dismissedTime < DISMISS_DURATION) {
                return;
            }
        }

        // Show popup if can install
        if (canInstall) {
            // Delay appearance for smooth entry
            const timer = setTimeout(() => {
                setIsAnimating(true);
                setIsVisible(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [canInstall, isInstalled, hydrated]);

    const handleDismiss = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem(DISMISS_KEY, Date.now().toString());
        }, 300);
    };

    const handleInstall = async () => {
        await installApp();
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 max-w-xs transition-all duration-300 ease-out ${isAnimating
                    ? 'translate-y-0 opacity-100 scale-100'
                    : 'translate-y-8 opacity-0 scale-95'
                }`}
        >
            <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-500/20 border border-indigo-100 overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 relative">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                            <Smartphone className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Install App</h3>
                            <p className="text-indigo-100 text-sm">Get the full experience!</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-gray-600 text-sm mb-4">
                        Install Star Rewards on your device for quick access and offline features!
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 px-4 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors text-sm"
                        >
                            Later
                        </button>
                        <button
                            onClick={handleInstall}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm"
                        >
                            <Download size={16} />
                            Install
                        </button>
                    </div>
                </div>

                {/* Animated dots decoration */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
        </div>
    );
}
