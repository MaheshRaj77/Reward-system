// ============================================
// FIRESTORE ADAPTER
// Firebase Firestore implementation of DatabaseAdapter
// ============================================

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    onSnapshot,
    writeBatch,
    serverTimestamp as firestoreServerTimestamp,
    Timestamp,
    QueryConstraint,
    DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
    DatabaseAdapter,
    QueryOptions,
    QueryFilter,
    BatchWriter,
    SubscriptionCallback,
    DocumentCallback,
    ErrorCallback,
    UnsubscribeFunction,
    FilterOperator,
} from './interfaces';

// ============================================
// OPERATOR MAPPING
// ============================================

const operatorMap: Record<FilterOperator, string> = {
    '==': '==',
    '!=': '!=',
    '<': '<',
    '<=': '<=',
    '>': '>',
    '>=': '>=',
    'in': 'in',
    'not-in': 'not-in',
    'array-contains': 'array-contains',
    'array-contains-any': 'array-contains-any',
};

// ============================================
// FIRESTORE BATCH WRITER
// ============================================

class FirestoreBatchWriter implements BatchWriter {
    private batch = writeBatch(db);

    set<T extends Record<string, unknown>>(
        collectionName: string,
        id: string,
        data: T
    ): BatchWriter {
        const ref = doc(db, collectionName, id);
        this.batch.set(ref, data as DocumentData);
        return this;
    }

    update(
        collectionName: string,
        id: string,
        data: Record<string, unknown>
    ): BatchWriter {
        const ref = doc(db, collectionName, id);
        this.batch.update(ref, data);
        return this;
    }

    delete(collectionName: string, id: string): BatchWriter {
        const ref = doc(db, collectionName, id);
        this.batch.delete(ref);
        return this;
    }

    async commit(): Promise<void> {
        await this.batch.commit();
    }
}

// ============================================
// FIRESTORE ADAPTER IMPLEMENTATION
// ============================================

export class FirestoreAdapter implements DatabaseAdapter {
    private connected = false;

    constructor() {
        // Check if Firestore is available
        this.connected = db !== null;
    }

    // ==========================================
    // DOCUMENT OPERATIONS
    // ==========================================

    async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return docSnap.data() as T;
    }

    async setDocument<T extends Record<string, unknown>>(
        collectionName: string,
        id: string,
        data: T
    ): Promise<void> {
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, data as DocumentData);
    }

    async updateDocument(
        collectionName: string,
        id: string,
        data: Record<string, unknown>
    ): Promise<void> {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data);
    }

    async deleteDocument(collectionName: string, id: string): Promise<void> {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
    }

    // ==========================================
    // QUERY OPERATIONS
    // ==========================================

    async queryDocuments<T>(
        collectionName: string,
        options?: QueryOptions
    ): Promise<T[]> {
        const constraints = this.buildConstraints(options);
        const q = query(collection(db, collectionName), ...constraints);
        const snapshot = await getDocs(q);

        const results: T[] = [];
        snapshot.forEach((doc) => {
            results.push(doc.data() as T);
        });

        return results;
    }

    // ==========================================
    // REAL-TIME SUBSCRIPTIONS
    // ==========================================

    subscribe<T>(
        collectionName: string,
        options: QueryOptions,
        onData: SubscriptionCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction {
        const constraints = this.buildConstraints(options);
        const q = query(collection(db, collectionName), ...constraints);

        return onSnapshot(
            q,
            (snapshot) => {
                const results: T[] = [];
                snapshot.forEach((doc) => {
                    results.push(doc.data() as T);
                });
                onData(results);
            },
            (error) => {
                if (onError) {
                    onError(error);
                }
            }
        );
    }

    subscribeToDocument<T>(
        collectionName: string,
        id: string,
        onData: DocumentCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction {
        const docRef = doc(db, collectionName, id);

        return onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    onData(snapshot.data() as T);
                } else {
                    onData(null);
                }
            },
            (error) => {
                if (onError) {
                    onError(error);
                }
            }
        );
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    generateId(prefix?: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    }

    serverTimestamp(): unknown {
        return firestoreServerTimestamp();
    }

    toTimestamp(date: Date): Timestamp {
        return Timestamp.fromDate(date);
    }

    fromTimestamp(timestamp: unknown): Date {
        if (timestamp instanceof Timestamp) {
            return timestamp.toDate();
        }
        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
            return (timestamp as Timestamp).toDate();
        }
        return new Date();
    }

    // ==========================================
    // BATCH OPERATIONS
    // ==========================================

    batch(): BatchWriter {
        return new FirestoreBatchWriter();
    }

    // ==========================================
    // CONNECTION MANAGEMENT
    // ==========================================

    isConnected(): boolean {
        return this.connected;
    }

    async connect(): Promise<void> {
        // Firestore is already connected via firebase.ts
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        // Firestore handles connection pooling automatically
        // No explicit disconnect needed for serverless
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    private buildConstraints(options?: QueryOptions): QueryConstraint[] {
        const constraints: QueryConstraint[] = [];

        if (!options) return constraints;

        // Add filters
        if (options.filters) {
            for (const filter of options.filters) {
                constraints.push(
                    where(filter.field, filter.operator as any, filter.value)
                );
            }
        }

        // Add ordering
        if (options.orderBy) {
            for (const order of options.orderBy) {
                constraints.push(orderBy(order.field, order.direction));
            }
        }

        // Add limit
        if (options.limit) {
            constraints.push(limit(options.limit));
        }

        // Add pagination
        if (options.startAfter) {
            constraints.push(startAfter(options.startAfter));
        }

        return constraints;
    }
}

// ============================================
// SINGLETON INSTANCE (for serverless caching)
// ============================================

let cachedAdapter: FirestoreAdapter | null = null;

export function getFirestoreAdapter(): FirestoreAdapter {
    if (!cachedAdapter) {
        cachedAdapter = new FirestoreAdapter();
    }
    return cachedAdapter;
}
