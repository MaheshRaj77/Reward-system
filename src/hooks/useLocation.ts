'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
    lat: number;
    lon: number;
    country: string | null;
    city: string | null;
    source: 'geolocation' | 'ip' | 'cookie';
}

const LOCATION_COOKIE_NAME = 'pinmbo_user_location';
const CONSENT_COOKIE_NAME = 'pinmbo_location_consent';
const COOKIE_MAX_AGE = 86400; // 24 hours

// Parse cookie value
const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
};

// Set cookie with security options
const setCookie = (name: string, value: string, maxAge: number = COOKIE_MAX_AGE) => {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? 'secure;' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; ${secure} samesite=strict`;
};

// Delete cookie
const deleteCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; max-age=0; path=/;`;
};

// Reverse geocode coordinates to city/country
const reverseGeocode = async (lat: number, lon: number): Promise<{ city: string | null; country: string | null }> => {
    console.log('[Location] Reverse geocoding:', { lat, lon });
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'PinmboApp/1.0' } }
        );
        if (!res.ok) return { city: null, country: null };
        const data = await res.json();
        const result = {
            country: data.address?.country || null,
            city: data.address?.city || data.address?.town || data.address?.village || data.address?.state || null
        };
        console.log('[Location] Reverse geocode result:', result);
        return result;
    } catch {
        console.warn('[Location] Reverse geocode failed');
        return { city: null, country: null };
    }
};

// IP-based location fallback (anonymized - city level only)
const getLocationFromIP = async (): Promise<LocationData | null> => {
    console.log('[Location] Trying IP fallback...');
    try {
        // Using ip-api.com free tier (no API key needed, 45 requests/minute limit)
        const res = await fetch('http://ip-api.com/json/?fields=status,country,city,lat,lon');
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status !== 'success') return null;

        const result = {
            lat: data.lat,
            lon: data.lon,
            country: data.country || null,
            city: data.city || null,
            source: 'ip' as const
        };
        console.log('[Location] IP fallback result:', result);
        return result;
    } catch {
        console.warn('[Location] IP fallback failed');
        return null;
    }
};

// Get location from browser geolocation
const getGeolocation = (): Promise<LocationData | null> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('[Location] Geolocation not supported');
            resolve(null);
            return;
        }

        console.log('[Location] Requesting browser geolocation...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log('[Location] Browser geolocation success:', { latitude, longitude });
                const { city, country } = await reverseGeocode(latitude, longitude);

                const locationData: LocationData = {
                    lat: latitude,
                    lon: longitude,
                    country,
                    city,
                    source: 'geolocation'
                };

                // Cache in cookie (anonymized - city level)
                setCookie(LOCATION_COOKIE_NAME, JSON.stringify({
                    lat: Math.round(latitude * 100) / 100, // Round to ~1km precision
                    lon: Math.round(longitude * 100) / 100,
                    country,
                    city
                }));
                console.log('[Location] Cached location in cookie');

                resolve(locationData);
            },
            (error) => {
                console.warn('[Location] Geolocation denied/error:', error.message);
                resolve(null);
            },
            { timeout: 10000, enableHighAccuracy: false, maximumAge: 300000 }
        );
    });
};

// Get cached location from cookie
const getCachedLocation = (): LocationData | null => {
    const cached = getCookie(LOCATION_COOKIE_NAME);
    if (!cached) return null;

    try {
        const data = JSON.parse(cached);
        return { ...data, source: 'cookie' as const };
    } catch {
        return null;
    }
};

// Check if user has consented to location tracking
export const hasLocationConsent = (): boolean => {
    return getCookie(CONSENT_COOKIE_NAME) === 'granted';
};

// Set location consent
export const setLocationConsent = (granted: boolean) => {
    if (granted) {
        setCookie(CONSENT_COOKIE_NAME, 'granted', 365 * 24 * 60 * 60); // 1 year
    } else {
        setCookie(CONSENT_COOKIE_NAME, 'denied', 365 * 24 * 60 * 60);
        deleteCookie(LOCATION_COOKIE_NAME); // Clear cached location if denied
    }
};

// Check if user has made a consent decision
export const hasConsentDecision = (): boolean => {
    const consent = getCookie(CONSENT_COOKIE_NAME);
    return consent === 'granted' || consent === 'denied';
};

// Main hook for location with consent management
export function useLocation() {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConsentBanner, setShowConsentBanner] = useState(false);

    // Check consent on mount
    useEffect(() => {
        if (!hasConsentDecision()) {
            setShowConsentBanner(true);
        } else if (hasLocationConsent()) {
            // Try cached location first
            const cached = getCachedLocation();
            if (cached) {
                setLocation(cached);
            }
        }
    }, []);

    // Request location (after consent granted)
    const requestLocation = useCallback(async () => {
        if (!hasLocationConsent()) {
            setError('Location consent not granted');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Try cached location
            const cached = getCachedLocation();
            if (cached) {
                setLocation(cached);
                setLoading(false);
                return cached;
            }

            // 2. Try browser geolocation
            const geoLocation = await getGeolocation();
            if (geoLocation) {
                setLocation(geoLocation);
                setLoading(false);
                return geoLocation;
            }

            // 3. Fallback to IP-based location
            const ipLocation = await getLocationFromIP();
            if (ipLocation) {
                setLocation(ipLocation);
                setLoading(false);
                return ipLocation;
            }

            setError('Could not determine location');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle consent response
    const handleConsent = useCallback((granted: boolean) => {
        setLocationConsent(granted);
        setShowConsentBanner(false);

        if (granted) {
            requestLocation();
        }
    }, [requestLocation]);

    // Get location for task creation (simplified)
    const getLocationForTask = useCallback(async (): Promise<LocationData | null> => {
        // If already have location, return it
        if (location) return location;

        // If no consent, return null (don't block task creation)
        if (!hasLocationConsent()) return null;

        // Try to get location
        return await requestLocation();
    }, [location, requestLocation]);

    return {
        location,
        loading,
        error,
        showConsentBanner,
        handleConsent,
        requestLocation,
        getLocationForTask,
        hasConsent: hasLocationConsent,
    };
}
