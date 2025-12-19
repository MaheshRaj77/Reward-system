'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChildProfile, ChildSession, ChildAuthState, COLLECTIONS, CHILD_SESSION_KEY } from './types';
import { childService } from './child.service';

interface ChildAuthContextValue extends ChildAuthState {
    login: (child: ChildProfile) => void;
    logout: () => void;
    refreshChild: () => Promise<void>;
}

const ChildAuthContext = createContext<ChildAuthContextValue | null>(null);

export function ChildAuthProvider({
    children,
    childId
}: {
    children: React.ReactNode;
    childId: string;
}) {
    const router = useRouter();
    const [state, setState] = useState<ChildAuthState>({
        child: null,
        session: null,
        loading: true,
        error: null,
    });

    // Subscribe to real-time child data updates
    useEffect(() => {
        if (!childId) {
            setState(prev => ({ ...prev, loading: false, error: 'No child ID provided' }));
            return;
        }

        // Get session from localStorage
        const session = childService.getSession();

        // Validate session matches current childId
        if (!session || session.childId !== childId) {
            console.log('[ChildAuth] Invalid or missing session, redirecting to login');
            setState(prev => ({ ...prev, loading: false, error: 'Session invalid' }));
            router.push('/child/login');
            return;
        }

        setState(prev => ({ ...prev, session }));

        // Subscribe to real-time updates for this child
        const unsubscribe = onSnapshot(
            doc(db, COLLECTIONS.CHILDREN, childId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const childData = { id: docSnap.id, ...docSnap.data() } as ChildProfile;
                    setState(prev => ({
                        ...prev,
                        child: childData,
                        loading: false,
                        error: null,
                    }));
                } else {
                    setState(prev => ({
                        ...prev,
                        child: null,
                        loading: false,
                        error: 'Child profile not found',
                    }));
                    router.push('/child/login');
                }
            },
            (error) => {
                console.error('[ChildAuth] Error subscribing to child data:', error);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load profile',
                }));
            }
        );

        // Update last active on mount
        childService.updateLastActive(childId);

        return () => unsubscribe();
    }, [childId, router]);

    // Login function - called after PIN verification
    const login = useCallback((child: ChildProfile) => {
        const session = childService.createSession(child);
        childService.saveSession(session);

        setState(prev => ({
            ...prev,
            child,
            session,
            loading: false,
            error: null,
        }));

        // Update last active
        childService.updateLastActive(child.id);

        // Navigate to child home
        router.push(`/child/${child.id}/home`);
    }, [router]);

    // Logout function
    const logout = useCallback(() => {
        childService.clearSession();
        setState({
            child: null,
            session: null,
            loading: false,
            error: null,
        });
        router.push('/child/login');
    }, [router]);

    // Refresh child data manually
    const refreshChild = useCallback(async () => {
        if (!childId) return;

        const child = await childService.getChild(childId);
        if (child) {
            setState(prev => ({ ...prev, child }));
        }
    }, [childId]);

    const value: ChildAuthContextValue = {
        ...state,
        login,
        logout,
        refreshChild,
    };

    return (
        <ChildAuthContext.Provider value={value}>
            {children}
        </ChildAuthContext.Provider>
    );
}

/**
 * Hook to access child auth context
 * Must be used within a ChildAuthProvider
 */
export function useChildAuth() {
    const context = useContext(ChildAuthContext);
    if (!context) {
        throw new Error('useChildAuth must be used within a ChildAuthProvider');
    }
    return context;
}

/**
 * Hook for the login page (no provider needed)
 * Provides login functionality without requiring context
 */
export function useChildLogin() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getChildrenByMobile = useCallback(async (mobileNumber: string) => {
        setLoading(true);
        setError(null);

        try {
            const children = await childService.getChildrenByParentMobile(mobileNumber);

            if (children.length === 0) {
                setError('No children found for this mobile number. Please check and try again.');
            }

            return children;
        } catch (err) {
            setError('Something went wrong. Please try again.');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const verifyAndLogin = useCallback(async (child: ChildProfile, pin: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await childService.verifyPin(child.id, pin);

            if (result.success) {
                // Create and save session
                const session = childService.createSession(child);
                childService.saveSession(session);

                // Update last active
                await childService.updateLastActive(child.id);

                // Navigate to child home
                router.push(`/child/${child.id}/home`);
                return true;
            } else {
                setError(result.error || 'Wrong PIN. Try again!');
                return false;
            }
        } catch (err) {
            setError('Failed to verify PIN. Please try again.');
            return false;
        } finally {
            setLoading(false);
        }
    }, [router]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        loading,
        error,
        getChildrenByMobile,
        verifyAndLogin,
        clearError,
    };
}
