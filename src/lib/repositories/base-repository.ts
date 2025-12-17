// ============================================
// BASE REPOSITORY
// Generic repository implementation
// ============================================

import type {
    DatabaseAdapter,
    QueryOptions,
    SubscriptionCallback,
    ErrorCallback,
    UnsubscribeFunction,
    BaseEntity,
    Repository,
} from '../db/interfaces';

// ============================================
// BASE REPOSITORY CLASS
// ============================================

export class BaseRepository<T extends BaseEntity> implements Repository<T> {
    protected collectionName: string;
    protected db: DatabaseAdapter;

    constructor(db: DatabaseAdapter, collectionName: string) {
        this.db = db;
        this.collectionName = collectionName;
    }

    // ==========================================
    // CRUD OPERATIONS
    // ==========================================

    async getById(id: string): Promise<T | null> {
        return this.db.getDocument<T>(this.collectionName, id);
    }

    async getAll(options?: QueryOptions): Promise<T[]> {
        return this.db.queryDocuments<T>(this.collectionName, options);
    }

    async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
        const id = data.id || this.db.generateId(this.getIdPrefix());
        const timestamp = this.db.serverTimestamp();

        const document = {
            ...data,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
        } as T;

        await this.db.setDocument(this.collectionName, id, document as Record<string, unknown>);

        return document;
    }

    async update(id: string, data: Partial<T>): Promise<void> {
        const updateData = {
            ...data,
            updatedAt: this.db.serverTimestamp(),
        };

        await this.db.updateDocument(
            this.collectionName,
            id,
            updateData as Record<string, unknown>
        );
    }

    async delete(id: string): Promise<void> {
        await this.db.deleteDocument(this.collectionName, id);
    }

    // ==========================================
    // SUBSCRIPTIONS
    // ==========================================

    subscribe(
        options: QueryOptions,
        onData: SubscriptionCallback<T>,
        onError?: ErrorCallback
    ): UnsubscribeFunction {
        return this.db.subscribe<T>(
            this.collectionName,
            options,
            onData,
            onError
        );
    }

    subscribeToOne(
        id: string,
        onData: (data: T | null) => void,
        onError?: ErrorCallback
    ): UnsubscribeFunction {
        return this.db.subscribeToDocument<T>(
            this.collectionName,
            id,
            onData,
            onError
        );
    }

    // ==========================================
    // QUERY HELPERS
    // ==========================================

    async findWhere(
        field: string,
        operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in',
        value: unknown
    ): Promise<T[]> {
        return this.getAll({
            filters: [{ field, operator, value }],
        });
    }

    async findOne(
        field: string,
        value: unknown
    ): Promise<T | null> {
        const results = await this.getAll({
            filters: [{ field, operator: '==', value }],
            limit: 1,
        });
        return results[0] || null;
    }

    // ==========================================
    // BATCH OPERATIONS
    // ==========================================

    async createMany(items: Array<Omit<T, 'id'> & { id?: string }>): Promise<T[]> {
        const batch = this.db.batch();
        const created: T[] = [];
        const timestamp = this.db.serverTimestamp();

        for (const data of items) {
            const id = data.id || this.db.generateId(this.getIdPrefix());
            const document = {
                ...data,
                id,
                createdAt: timestamp,
                updatedAt: timestamp,
            } as T;

            batch.set(this.collectionName, id, document as Record<string, unknown>);
            created.push(document);
        }

        await batch.commit();
        return created;
    }

    async updateMany(
        updates: Array<{ id: string; data: Partial<T> }>
    ): Promise<void> {
        const batch = this.db.batch();
        const timestamp = this.db.serverTimestamp();

        for (const { id, data } of updates) {
            batch.update(this.collectionName, id, {
                ...data,
                updatedAt: timestamp,
            } as Record<string, unknown>);
        }

        await batch.commit();
    }

    async deleteMany(ids: string[]): Promise<void> {
        const batch = this.db.batch();

        for (const id of ids) {
            batch.delete(this.collectionName, id);
        }

        await batch.commit();
    }

    // ==========================================
    // PROTECTED HELPERS
    // ==========================================

    protected getIdPrefix(): string {
        // Override in subclasses for custom prefixes
        return this.collectionName.slice(0, -1); // e.g., "children" -> "child"
    }
}
