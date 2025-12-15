// ============================================
// AUTH CONTEXT
// React context for parent authentication state
// ============================================

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import type { Parent, Family } from '@/types';
import {
    ParentAuth,
    registerParent,
    loginParent,
    logoutParent,
    resetParentPassword,
    getCurrentParent,
    onParentAuthStateChange,
} from '@/lib/auth/parent-auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthState {
    user: FirebaseUser | null;
    parent: Parent | null;
    family: Family | null;
    loading: boolean;
    error: string | null;
}

interface AuthContextValue extends AuthState {
    register: (data: {
        email: string;
        password: string;
        name: string;
        familyName: string;
    }) => Promise<{ success: boolean; error?: string }>;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        parent: null,
        family: null,
        loading: true,
        error: null,
    });

    // Subscribe to auth state changes
    useEffect(() => {
        const unsubscribe = onParentAuthStateChange(async (user) => {
            if (user) {
                // Fetch parent profile
                const parent = await getCurrentParent();
                if (parent) {
                    // Fetch family
                    const familyDoc = await getDoc(doc(db, 'families', parent.familyId));
                    const family = familyDoc.exists() ? (familyDoc.data() as Family) : null;

                    setState({
                        user,
                        parent,
                        family,
                        loading: false,
                        error: null,
                    });
                } else {
                    setState({
                        user,
                        parent: null,
                        family: null,
                        loading: false,
                        error: null,
                    });
                }
            } else {
                setState({
                    user: null,
                    parent: null,
                    family: null,
                    loading: false,
                    error: null,
                });
            }
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to family changes in real-time
    useEffect(() => {
        if (!state.parent?.familyId) return;

        const unsubscribe = onSnapshot(
            doc(db, 'families', state.parent.familyId),
            (doc) => {
                if (doc.exists()) {
                    setState((prev) => ({
                        ...prev,
                        family: doc.data() as Family,
                    }));
                }
            }
        );

        return () => unsubscribe();
    }, [state.parent?.familyId]);

    const register = useCallback(async (data: {
        email: string;
        password: string;
        name: string;
        familyName: string;
    }) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const result = await registerParent(data);

        if (!result.success) {
            setState((prev) => ({ ...prev, loading: false, error: result.error || 'Registration failed' }));
            return { success: false, error: result.error };
        }

        return { success: true };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const result = await loginParent(email, password);

        if (!result.success) {
            setState((prev) => ({ ...prev, loading: false, error: result.error || 'Login failed' }));
            return { success: false, error: result.error };
        }

        return { success: true };
    }, []);

    const logout = useCallback(async () => {
        await logoutParent();
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const result = await resetParentPassword(email);
        return result;
    }, []);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return (
        <AuthContext.Provider
            value={{
                ...state,
                register,
                login,
                logout,
                resetPassword,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useRequireAuth() {
    const auth = useAuth();

    useEffect(() => {
        if (!auth.loading && !auth.user) {
            window.location.href = '/auth/login';
        }
    }, [auth.loading, auth.user]);

    return auth;
}
