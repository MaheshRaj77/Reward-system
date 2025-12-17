// ============================================
// DATABASE ABSTRACTION LAYER - INTERFACES
// Core interfaces for database adapter pattern
// Supports: Firestore, MongoDB, DynamoDB, Memory
// ============================================

import { Timestamp } from 'firebase/firestore';

// ============================================
// QUERY INTERFACES
// ============================================

export type FilterOperator =
    | '=='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'in'
    | 'not-in'
    | 'array-contains'
    | 'array-contains-any';

export interface QueryFilter {
    field: string;
    operator: FilterOperator;
    value: unknown;
}

export interface OrderByClause {
    field: string;
    direction: 'asc' | 'desc';
}

export interface QueryOptions {
    filters?: QueryFilter[];
    orderBy?: OrderByClause[];
    limit?: number;
    startAfter?: unknown;
    endBefore?: unknown;
}

// ============================================
// SUBSCRIPTION CALLBACK TYPES
// ============================================

export type SubscriptionCallback<T> = (data: T[]) => void;
export type DocumentCallback<T> = (data: T | null) => void;
export type ErrorCallback = (error: Error) => void;
export type UnsubscribeFunction = () => void;

// ============================================
// BATCH WRITER INTERFACE
// ============================================

export interface BatchWriter {
    set<T extends Record<string, unknown>>(
        collection: string,
        id: string,
        data: T
    ): BatchWriter;

    update(
        collection: string,
        id: string,
        data: Record<string, unknown>
    ): BatchWriter;

    delete(collection: string, id: string): BatchWriter;

    commit(): Promise<void>;
}

// ============================================
// CORE DATABASE ADAPTER INTERFACE
// ============================================

export interface DatabaseAdapter {
    // ==========================================
    // DOCUMENT OPERATIONS
    // ==========================================

    /**
     * Get a single document by ID
     */
    getDocument<T>(collection: string, id: string): Promise<T | null>;

    /**
     * Create or overwrite a document
     */
    setDocument<T extends Record<string, unknown>>(
        collection: string,
        id: string,
        data: T
    ): Promise<void>;

    /**
     * Partially update a document
     */
    updateDocument(
        collection: string,
        id: string,
        data: Record<string, unknown>
    ): Promise<void>;

    /**
     * Delete a document
     */
    deleteDocument(collection: string, id: string): Promise<void>;

    // ==========================================
    // QUERY OPERATIONS
    // ==========================================

    /**
     * Query documents with filters, ordering, and pagination
     */
    queryDocuments<T>(
        collection: string,
        options?: QueryOptions
    ): Promise<T[]>;

    // ==========================================
    // REAL-TIME SUBSCRIPTIONS
    // ==========================================

    /**
     * Subscribe to a collection query (real-time updates)
     * Returns an unsubscribe function
     */
    subscribe<T>(
        collection: string,
        options: QueryOptions,
        onData: SubscriptionCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction;

    /**
     * Subscribe to a single document (real-time updates)
     * Returns an unsubscribe function
     */
    subscribeToDocument<T>(
        collection: string,
        id: string,
        onData: DocumentCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction;

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Generate a unique document ID
     */
    generateId(prefix?: string): string;

    /**
     * Get a server timestamp placeholder
     */
    serverTimestamp(): unknown;

    /**
     * Convert a date to the database's timestamp format
     */
    toTimestamp(date: Date): unknown;

    /**
     * Convert a database timestamp to a JavaScript Date
     */
    fromTimestamp(timestamp: unknown): Date;

    // ==========================================
    // BATCH OPERATIONS
    // ==========================================

    /**
     * Create a batch writer for atomic operations
     */
    batch(): BatchWriter;

    // ==========================================
    // CONNECTION MANAGEMENT
    // ==========================================

    /**
     * Check if adapter is connected/initialized
     */
    isConnected(): boolean;

    /**
     * Initialize/connect the adapter (if needed)
     */
    connect?(): Promise<void>;

    /**
     * Cleanup/disconnect (for serverless environments)
     */
    disconnect?(): Promise<void>;
}

// ============================================
// ADAPTER FACTORY TYPES
// ============================================

export type DatabaseType = 'firestore' | 'memory' | 'mongodb' | 'dynamodb';

export interface DatabaseConfig {
    type: DatabaseType;
    // Firestore config
    firestore?: {
        projectId?: string;
        // Uses existing firebase.ts initialization
    };
    // MongoDB config
    mongodb?: {
        uri: string;
        database: string;
    };
    // DynamoDB config
    dynamodb?: {
        region: string;
        tableName: string;
        accessKeyId?: string;
        secretAccessKey?: string;
    };
}

// ============================================
// REPOSITORY BASE TYPES
// ============================================

export interface BaseEntity {
    id: string;
    createdAt?: Timestamp | unknown;
    updatedAt?: Timestamp | unknown;
}

export interface Repository<T extends BaseEntity> {
    getById(id: string): Promise<T | null>;
    getAll(options?: QueryOptions): Promise<T[]>;
    create(data: Omit<T, 'id'> & { id?: string }): Promise<T>;
    update(id: string, data: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
    subscribe(
        options: QueryOptions,
        onData: SubscriptionCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction;
}
