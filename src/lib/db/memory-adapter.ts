// ============================================
// MEMORY ADAPTER
// In-memory implementation for testing
// ============================================

import type {
    DatabaseAdapter,
    QueryOptions,
    BatchWriter,
    SubscriptionCallback,
    DocumentCallback,
    ErrorCallback,
    UnsubscribeFunction,
} from './interfaces';

// ============================================
// IN-MEMORY STORAGE
// ============================================

type CollectionData = Map<string, Record<string, unknown>>;
type SubscriberInfo<T> = {
    options: QueryOptions;
    callback: SubscriptionCallback<T>;
};

// ============================================
// MEMORY BATCH WRITER
// ============================================

class MemoryBatchWriter implements BatchWriter {
    private operations: Array<{
        type: 'set' | 'update' | 'delete';
        collection: string;
        id: string;
        data?: Record<string, unknown>;
    }> = [];

    private storage: Map<string, CollectionData>;
    private notifySubscribers: () => void;

    constructor(
        storage: Map<string, CollectionData>,
        notifySubscribers: () => void
    ) {
        this.storage = storage;
        this.notifySubscribers = notifySubscribers;
    }

    set<T extends Record<string, unknown>>(
        collection: string,
        id: string,
        data: T
    ): BatchWriter {
        this.operations.push({ type: 'set', collection, id, data });
        return this;
    }

    update(
        collection: string,
        id: string,
        data: Record<string, unknown>
    ): BatchWriter {
        this.operations.push({ type: 'update', collection, id, data });
        return this;
    }

    delete(collection: string, id: string): BatchWriter {
        this.operations.push({ type: 'delete', collection, id });
        return this;
    }

    async commit(): Promise<void> {
        for (const op of this.operations) {
            const collectionData = this.storage.get(op.collection) || new Map();

            switch (op.type) {
                case 'set':
                    collectionData.set(op.id, { ...op.data, id: op.id });
                    break;
                case 'update':
                    const existing = collectionData.get(op.id);
                    if (existing) {
                        collectionData.set(op.id, { ...existing, ...op.data });
                    }
                    break;
                case 'delete':
                    collectionData.delete(op.id);
                    break;
            }

            this.storage.set(op.collection, collectionData);
        }

        // Notify subscribers after all operations
        this.notifySubscribers();
    }
}

// ============================================
// MEMORY ADAPTER IMPLEMENTATION
// ============================================

export class MemoryAdapter implements DatabaseAdapter {
    private storage = new Map<string, CollectionData>();
    private subscribers = new Map<string, Set<SubscriberInfo<unknown>>>();
    private documentSubscribers = new Map<string, Set<{
        callback: DocumentCallback<unknown>;
    }>>();

    // ==========================================
    // DOCUMENT OPERATIONS
    // ==========================================

    async getDocument<T>(collection: string, id: string): Promise<T | null> {
        const collectionData = this.storage.get(collection);
        if (!collectionData) return null;

        const doc = collectionData.get(id);
        return doc ? (doc as T) : null;
    }

    async setDocument<T extends Record<string, unknown>>(
        collection: string,
        id: string,
        data: T
    ): Promise<void> {
        let collectionData = this.storage.get(collection);
        if (!collectionData) {
            collectionData = new Map();
            this.storage.set(collection, collectionData);
        }

        collectionData.set(id, { ...data, id });
        this.notifyCollectionSubscribers(collection);
        this.notifyDocumentSubscribers(collection, id);
    }

    async updateDocument(
        collection: string,
        id: string,
        data: Record<string, unknown>
    ): Promise<void> {
        const collectionData = this.storage.get(collection);
        if (!collectionData) return;

        const existing = collectionData.get(id);
        if (existing) {
            collectionData.set(id, { ...existing, ...data });
            this.notifyCollectionSubscribers(collection);
            this.notifyDocumentSubscribers(collection, id);
        }
    }

    async deleteDocument(collection: string, id: string): Promise<void> {
        const collectionData = this.storage.get(collection);
        if (collectionData) {
            collectionData.delete(id);
            this.notifyCollectionSubscribers(collection);
            this.notifyDocumentSubscribers(collection, id);
        }
    }

    // ==========================================
    // QUERY OPERATIONS
    // ==========================================

    async queryDocuments<T>(
        collection: string,
        options?: QueryOptions
    ): Promise<T[]> {
        const collectionData = this.storage.get(collection);
        if (!collectionData) return [];

        let results = Array.from(collectionData.values()) as T[];

        // Apply filters
        if (options?.filters) {
            results = results.filter((doc) => {
                return options.filters!.every((filter) => {
                    const value = (doc as Record<string, unknown>)[filter.field];
                    return this.evaluateFilter(value, filter.operator, filter.value);
                });
            });
        }

        // Apply ordering
        if (options?.orderBy) {
            results.sort((a, b) => {
                for (const order of options.orderBy!) {
                    const aVal = (a as Record<string, unknown>)[order.field];
                    const bVal = (b as Record<string, unknown>)[order.field];

                    // Safe comparison for unknown types
                    const aStr = String(aVal ?? '');
                    const bStr = String(bVal ?? '');

                    let comparison = 0;
                    if (aStr < bStr) comparison = -1;
                    else if (aStr > bStr) comparison = 1;

                    if (comparison !== 0) {
                        return order.direction === 'desc' ? -comparison : comparison;
                    }
                }
                return 0;
            });
        }

        // Apply limit
        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    // ==========================================
    // REAL-TIME SUBSCRIPTIONS
    // ==========================================

    subscribe<T>(
        collection: string,
        options: QueryOptions,
        onData: SubscriptionCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction {
        let subscribers = this.subscribers.get(collection);
        if (!subscribers) {
            subscribers = new Set();
            this.subscribers.set(collection, subscribers);
        }

        const subscriberInfo: SubscriberInfo<T> = {
            options,
            callback: onData,
        };

        subscribers.add(subscriberInfo as SubscriberInfo<unknown>);

        // Immediately emit current data
        this.queryDocuments<T>(collection, options).then(onData);

        // Return unsubscribe function
        return () => {
            subscribers?.delete(subscriberInfo as SubscriberInfo<unknown>);
        };
    }

    subscribeToDocument<T>(
        collection: string,
        id: string,
        onData: DocumentCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction {
        const key = `${collection}/${id}`;
        let subscribers = this.documentSubscribers.get(key);
        if (!subscribers) {
            subscribers = new Set();
            this.documentSubscribers.set(key, subscribers);
        }

        const subscriberInfo = { callback: onData as DocumentCallback<unknown> };
        subscribers.add(subscriberInfo);

        // Immediately emit current data
        this.getDocument<T>(collection, id).then(onData);

        // Return unsubscribe function
        return () => {
            subscribers?.delete(subscriberInfo);
        };
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    generateId(prefix?: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    }

    serverTimestamp(): Date {
        return new Date();
    }

    toTimestamp(date: Date): Date {
        return date;
    }

    fromTimestamp(timestamp: unknown): Date {
        if (timestamp instanceof Date) {
            return timestamp;
        }
        if (typeof timestamp === 'number') {
            return new Date(timestamp);
        }
        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
            return (timestamp as { toDate: () => Date }).toDate();
        }
        return new Date();
    }

    // ==========================================
    // BATCH OPERATIONS
    // ==========================================

    batch(): BatchWriter {
        return new MemoryBatchWriter(
            this.storage,
            () => this.notifyAllSubscribers()
        );
    }

    // ==========================================
    // CONNECTION MANAGEMENT
    // ==========================================

    isConnected(): boolean {
        return true; // Always connected for memory adapter
    }

    async connect(): Promise<void> {
        // No-op for memory adapter
    }

    async disconnect(): Promise<void> {
        // Optionally clear storage on disconnect
    }

    // ==========================================
    // TEST UTILITIES
    // ==========================================

    /**
     * Clear all data (useful for test setup/teardown)
     */
    clear(): void {
        this.storage.clear();
        this.notifyAllSubscribers();
    }

    /**
     * Seed data for testing
     */
    seed(collection: string, documents: Record<string, unknown>[]): void {
        let collectionData = this.storage.get(collection);
        if (!collectionData) {
            collectionData = new Map();
            this.storage.set(collection, collectionData);
        }

        for (const doc of documents) {
            const id = (doc as { id?: string }).id || this.generateId();
            collectionData.set(id, { ...doc, id });
        }

        this.notifyCollectionSubscribers(collection);
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    private evaluateFilter(
        value: unknown,
        operator: string,
        target: unknown
    ): boolean {
        switch (operator) {
            case '==':
                return value === target;
            case '!=':
                return value !== target;
            case '<':
                return (value as number) < (target as number);
            case '<=':
                return (value as number) <= (target as number);
            case '>':
                return (value as number) > (target as number);
            case '>=':
                return (value as number) >= (target as number);
            case 'in':
                return (target as unknown[]).includes(value);
            case 'not-in':
                return !(target as unknown[]).includes(value);
            case 'array-contains':
                return Array.isArray(value) && value.includes(target);
            case 'array-contains-any':
                return Array.isArray(value) &&
                    (target as unknown[]).some((t) => value.includes(t));
            default:
                return false;
        }
    }

    private notifyCollectionSubscribers(collection: string): void {
        const subscribers = this.subscribers.get(collection);
        if (!subscribers) return;

        for (const subscriber of subscribers) {
            this.queryDocuments(collection, subscriber.options)
                .then(subscriber.callback);
        }
    }

    private notifyDocumentSubscribers(collection: string, id: string): void {
        const key = `${collection}/${id}`;
        const subscribers = this.documentSubscribers.get(key);
        if (!subscribers) return;

        for (const subscriber of subscribers) {
            this.getDocument(collection, id).then(subscriber.callback);
        }
    }

    private notifyAllSubscribers(): void {
        for (const [collection] of this.subscribers) {
            this.notifyCollectionSubscribers(collection);
        }
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let cachedAdapter: MemoryAdapter | null = null;

export function getMemoryAdapter(): MemoryAdapter {
    if (!cachedAdapter) {
        cachedAdapter = new MemoryAdapter();
    }
    return cachedAdapter;
}
