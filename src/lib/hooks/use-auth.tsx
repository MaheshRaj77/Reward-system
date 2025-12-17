// ============================================
// AUTH CONTEXT - BACKWARD COMPATIBILITY LAYER
// Wraps the new ParentAuthProvider for backward compatibility
// ============================================

'use client';

import React from 'react';
import {
    ParentAuthProvider,
    useParentAuth,
    ParentUser
} from '@/modules/parent';

// Re-export ParentAuthProvider as AuthProvider for backward compatibility
export const AuthProvider = ParentAuthProvider;

// Create a compatibility wrapper for useAuth
// Maps new ParentUser to old Parent interface shape
export function useAuth() {
    const parentAuth = useParentAuth();

    // Create compatibility layer
    // Old hooks expect 'family' property - we'll return null for now
    return {
        ...parentAuth,
        parent: parentAuth.parent ? {
            ...parentAuth.parent,
            // Add any missing fields old code expects
            familyId: '',  // Deprecated - no longer using family system
            role: 'admin' as const,
            subscription: {
                plan: 'free' as const,
                status: 'active' as const,
                currentPeriodStart: null,
                currentPeriodEnd: null,
            },
        } : null,
        family: null,  // Deprecated - no longer using family system
        register: async () => ({ success: false, error: 'Use mobile login instead' }),
        login: async () => ({ success: false, error: 'Use mobile login instead' }),
        resetPassword: async () => ({ success: false, error: 'Not supported' }),
        clearError: () => { },
    };
}

// Re-export useParentAuth as useRequireAuth for backward compatibility
export function useRequireAuth() {
    const auth = useAuth();
    return auth;
}
