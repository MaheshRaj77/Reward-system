// ============================================
// DATABASE ABSTRACTION LAYER - EXPORTS
// ============================================

// Interfaces
export type {
    DatabaseAdapter,
    DatabaseType,
    DatabaseConfig,
    QueryOptions,
    QueryFilter,
    FilterOperator,
    OrderByClause,
    BatchWriter,
    SubscriptionCallback,
    DocumentCallback,
    ErrorCallback,
    UnsubscribeFunction,
    BaseEntity,
    Repository,
} from './interfaces';

// Adapters
export { FirestoreAdapter, getFirestoreAdapter } from './firestore-adapter';
export { MemoryAdapter, getMemoryAdapter } from './memory-adapter';

// Provider and hooks
export {
    DatabaseProvider,
    useDatabase,
    useDatabaseOptional,
    createDatabaseAdapter,
    getDatabaseAdapter,
    resetDatabaseAdapter,
} from './provider';
