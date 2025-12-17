// ============================================
// DATABASE PROVIDER
// React context for database adapter injection
// ============================================

'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { DatabaseAdapter, DatabaseType } from './interfaces';
import { FirestoreAdapter, getFirestoreAdapter } from './firestore-adapter';
import { MemoryAdapter, getMemoryAdapter } from './memory-adapter';

// ============================================
// CONTEXT
// ============================================

const DatabaseContext = createContext<DatabaseAdapter | null>(null);

// ============================================
// ADAPTER FACTORY
// ============================================

export function createDatabaseAdapter(type: DatabaseType): DatabaseAdapter {
    switch (type) {
        case 'firestore':
            return getFirestoreAdapter();
        case 'memory':
            return getMemoryAdapter();
        case 'mongodb':
            // TODO: Implement when needed
            console.warn('MongoDB adapter not yet implemented, falling back to Firestore');
            return getFirestoreAdapter();
        case 'dynamodb':
            // TODO: Implement when needed
            console.warn('DynamoDB adapter not yet implemented, falling back to Firestore');
            return getFirestoreAdapter();
        default:
            console.warn(`Unknown database type: ${type}, falling back to Firestore`);
            return getFirestoreAdapter();
    }
}

// ============================================
// PROVIDER COMPONENT
// ============================================

interface DatabaseProviderProps {
    children: ReactNode;
    type?: DatabaseType;
    adapter?: DatabaseAdapter; // Allow custom adapter injection
}

export function DatabaseProvider({
    children,
    type,
    adapter,
}: DatabaseProviderProps) {
    const databaseAdapter = useMemo(() => {
        // Use provided adapter if available
        if (adapter) return adapter;

        // Otherwise, create based on type or environment variable
        const dbType = type ||
            (process.env.NEXT_PUBLIC_DATABASE_TYPE as DatabaseType) ||
            'firestore';

        return createDatabaseAdapter(dbType);
    }, [type, adapter]);

    return (
        <DatabaseContext.Provider value={databaseAdapter}>
            {children}
        </DatabaseContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

/**
 * Get the current database adapter from context
 * @throws Error if used outside of DatabaseProvider
 */
export function useDatabase(): DatabaseAdapter {
    const context = useContext(DatabaseContext);

    if (!context) {
        throw new Error(
            'useDatabase must be used within a DatabaseProvider. ' +
            'Wrap your app with <DatabaseProvider> in layout.tsx'
        );
    }

    return context;
}

/**
 * Get the current database adapter, or null if not in provider
 * Useful for optional database access
 */
export function useDatabaseOptional(): DatabaseAdapter | null {
    return useContext(DatabaseContext);
}

// ============================================
// UTILITY: GET ADAPTER OUTSIDE REACT
// ============================================

// Cached adapter for use outside React components
let globalAdapter: DatabaseAdapter | null = null;

/**
 * Get a database adapter outside of React context
 * Useful for server-side operations or utility functions
 */
export function getDatabaseAdapter(type?: DatabaseType): DatabaseAdapter {
    if (globalAdapter) return globalAdapter;

    const dbType = type ||
        (process.env.NEXT_PUBLIC_DATABASE_TYPE as DatabaseType) ||
        'firestore';

    globalAdapter = createDatabaseAdapter(dbType);
    return globalAdapter;
}

/**
 * Reset the global adapter (useful for testing)
 */
export function resetDatabaseAdapter(): void {
    globalAdapter = null;
}
