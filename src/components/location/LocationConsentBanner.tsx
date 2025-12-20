'use client';

import { X, MapPin, Shield } from 'lucide-react';

interface LocationConsentBannerProps {
    onAccept: () => void;
    onDecline: () => void;
}

export default function LocationConsentBanner({ onAccept, onDecline }: LocationConsentBannerProps) {
    return (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <MapPin className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-semibold">Location Access</h3>
                        <p className="text-white/80 text-sm">Help us improve your experience</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We'd like to access your location to provide location-based analytics for tasks.
                        Your location data will be:
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <Shield size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Anonymized to city-level only</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Shield size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Stored securely in a cookie for 24 hours</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Shield size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Used only for analytics, never shared</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500">
                        You can change this preference anytime in settings. By clicking "Allow",
                        you consent to location tracking as described in our{' '}
                        <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>.
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={onDecline}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Not Now
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        Allow Location
                    </button>
                </div>
            </div>
        </div>
    );
}
