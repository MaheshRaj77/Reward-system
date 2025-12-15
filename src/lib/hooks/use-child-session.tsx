// ============================================
// CHILD SESSION CONTEXT
// React context for child authentication state
// ============================================

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Child, ChildSession } from '@/types';
import {
    ChildSessionManager,
    loginChildWithPin,
    loginChildWithAvatar,
    loginChildWithQR,
    validateChildSession,
    endChildSession,
} from '@/lib/auth/child-session';

interface ChildSessionState {
    child: Child | null;
    session: ChildSession | null;
    loading: boolean;
    error: string | null;
}

interface ChildSessionContextValue extends ChildSessionState {
    loginWithPin: (familyId: string, childId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
    loginWithAvatar: (familyId: string, avatarId: string) => Promise<{ success: boolean; error?: string }>;
    loginWithQR: (token: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const ChildSessionContext = createContext<ChildSessionContextValue | null>(null);

// Generate a stable device ID
function getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';

    let deviceId = localStorage.getItem('reward_device_id');
    if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('reward_device_id', deviceId);
    }
    return deviceId;
}

export function ChildSessionProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ChildSessionState>({
        child: null,
        session: null,
        loading: true,
        error: null,
    });

    // Restore session from localStorage on mount
    useEffect(() => {
        const restoreSession = async () => {
            const sessionId = localStorage.getItem('child_session_id');
            if (sessionId) {
                const result = await validateChildSession(sessionId);
                if (result.valid && result.session && result.child) {
                    setState({
                        child: result.child,
                        session: result.session,
                        loading: false,
                        error: null,
                    });
                    return;
                } else {
                    // Clear invalid session
                    localStorage.removeItem('child_session_id');
                }
            }
            setState((prev) => ({ ...prev, loading: false }));
        };

        restoreSession();
    }, []);

    const loginWithPin = useCallback(async (familyId: string, childId: string, pin: string) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const deviceId = getDeviceId();
        const result = await ChildSessionManager.loginWithPin(familyId, childId, pin, deviceId);

        if (!result.success) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: result.error || 'Login failed'
            }));
            return { success: false, error: result.error };
        }

        // Store session ID
        localStorage.setItem('child_session_id', result.session!.id);

        setState({
            child: result.child!,
            session: result.session!,
            loading: false,
            error: null,
        });

        return { success: true };
    }, []);

    const loginWithAvatar = useCallback(async (familyId: string, avatarId: string) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const deviceId = getDeviceId();
        const result = await ChildSessionManager.loginWithAvatar(familyId, avatarId, deviceId);

        if (!result.success) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: result.error || 'Login failed'
            }));
            return { success: false, error: result.error };
        }

        localStorage.setItem('child_session_id', result.session!.id);

        setState({
            child: result.child!,
            session: result.session!,
            loading: false,
            error: null,
        });

        return { success: true };
    }, []);

    const loginWithQR = useCallback(async (token: string) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const deviceId = getDeviceId();
        const result = await ChildSessionManager.loginWithQRToken(token, deviceId);

        if (!result.success) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: result.error || 'Login failed'
            }));
            return { success: false, error: result.error };
        }

        localStorage.setItem('child_session_id', result.session!.id);

        setState({
            child: result.child!,
            session: result.session!,
            loading: false,
            error: null,
        });

        return { success: true };
    }, []);

    const logout = useCallback(async () => {
        if (state.session) {
            await endChildSession(state.session.id);
        }
        localStorage.removeItem('child_session_id');
        setState({
            child: null,
            session: null,
            loading: false,
            error: null,
        });
    }, [state.session]);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return (
        <ChildSessionContext.Provider
            value={{
                ...state,
                loginWithPin,
                loginWithAvatar,
                loginWithQR,
                logout,
                clearError,
            }}
        >
            {children}
        </ChildSessionContext.Provider>
    );
}

export function useChildSession() {
    const context = useContext(ChildSessionContext);
    if (!context) {
        throw new Error('useChildSession must be used within a ChildSessionProvider');
    }
    return context;
}

export function useRequireChildSession() {
    const session = useChildSession();

    useEffect(() => {
        if (!session.loading && !session.child) {
            window.location.href = '/child/login';
        }
    }, [session.loading, session.child]);

    return session;
}
