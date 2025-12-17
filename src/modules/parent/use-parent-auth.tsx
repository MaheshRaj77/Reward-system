'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ParentUser } from '@/modules/parent';
import { parentService } from '@/modules/parent';

interface AuthState {
    user: FirebaseUser | null;
    parent: ParentUser | null;
    loading: boolean;
    error: string | null;
}

interface ParentAuthContextValue extends AuthState {
    logout: () => Promise<void>;
    refreshParent: () => Promise<void>;
}

const ParentAuthContext = createContext<ParentAuthContextValue | null>(null);

export function ParentAuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        parent: null,
        loading: true,
        error: null,
    });

    // Fetch parent data from Firestore
    const fetchParentData = useCallback(async (user: FirebaseUser) => {
        try {
            const parent = await parentService.getParent(user.uid);

            setState(prev => ({
                ...prev,
                user,
                parent,
                loading: false,
                error: parent ? null : 'Parent profile not found',
            }));
        } catch (error) {
            console.error('[ParentAuth] Error fetching parent:', error);
            setState(prev => ({
                ...prev,
                user,
                parent: null,
                loading: false,
                error: 'Failed to load profile',
            }));
        }
    }, []);

    // Subscribe to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await fetchParentData(user);
            } else {
                setState({
                    user: null,
                    parent: null,
                    loading: false,
                    error: null,
                });
            }
        });

        return () => unsubscribe();
    }, [fetchParentData]);

    // Logout function
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            setState({
                user: null,
                parent: null,
                loading: false,
                error: null,
            });
        } catch (error) {
            console.error('[ParentAuth] Logout error:', error);
        }
    }, []);

    // Refresh parent data (after profile update)
    const refreshParent = useCallback(async () => {
        if (state.user) {
            await fetchParentData(state.user);
        }
    }, [state.user, fetchParentData]);

    const value: ParentAuthContextValue = {
        ...state,
        logout,
        refreshParent,
    };

    return (
        <ParentAuthContext.Provider value={value}>
            {children}
        </ParentAuthContext.Provider>
    );
}

export function useParentAuth() {
    const context = useContext(ParentAuthContext);
    if (!context) {
        throw new Error('useParentAuth must be used within a ParentAuthProvider');
    }
    return context;
}
