/**
 * Weblisk Framework - Real-time Database Integration
 * Optimized for real-time applications with streaming capabilities
 */

export interface DatabaseConfig {
  // Connection configuration
  type: "sqlite" | "postgres" | "mysql" | "mongodb";
  connectionString?: string;

  // Real-time features
  enableStreaming: boolean;
  enableChangeStreams: boolean;
  poolSize: number;

  // Caching integration
  enableQueryCache: boolean;
  cacheStrategy: "memory" | "redis" | "hybrid";
  cacheTTL: number;
}

export interface DatabaseResult {
  affectedRows: number;
  changes: number; // Add changes property
  lastInsertId?: string | number;
}

export interface QueryOptions {
  // Caching options
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;

  // Real-time options
  stream?: boolean;
  watchChanges?: boolean;

  // Performance options
  timeout?: number;
  priority?: "low" | "normal" | "high";
}

export interface StreamOptions {
  // What changes to watch
  operations?: ("insert" | "update" | "delete")[];

  // Filtering
  filter?: Record<string, unknown>;

  // Event naming
  eventName?: string;

  // Performance optimization
  batchSize?: number;
  includeDeletes?: boolean;
  debounceMs?: number; // Add missing property
}

export interface DatabaseTransaction {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(
    sql: string,
    params?: unknown[],
  ): Promise<{ changes: number; lastInsertId?: string | number }>;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

/**
 * Abstract database adapter interface
 */
export abstract class DatabaseAdapter {
  public config: DatabaseConfig; // Make config public

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query<T = unknown>(
    sql: string,
    params?: unknown[],
    options?: QueryOptions,
  ): Promise<T[]>;
  abstract execute(
    sql: string,
    params?: unknown[],
  ): Promise<DatabaseResult>;
  abstract transaction<T>(
    operations: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T>;
  abstract health(): Promise<boolean>;
  abstract createChangeStream(
    prefix: string,
    options: StreamOptions,
  ): AsyncIterableIterator<unknown>;
}

/**
 * Database manager with real-time capabilities
 */
export class WebliskDatabase {
  private adapter: DatabaseAdapter;
  private queryCache = new Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  >();
  private changeStreams = new Map<string, AsyncIterableIterator<unknown>>();
  private streamCallbacks = new Map<string, ((change: unknown) => void)[]>();

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    // Stop all change streams
    this.changeStreams.clear();
    this.streamCallbacks.clear();

    await this.adapter.disconnect();
  }

  /**
   * Execute a query with caching support
   */
  async query<T = unknown>(
    sql: string,
    params?: unknown[],
    options: QueryOptions = {},
  ): Promise<T[]> {
    const cacheKey = options.cacheKey || this.generateCacheKey(sql, params);

    // Check cache first
    if (options.cache !== false && this.adapter.config.enableQueryCache) {
      const cached = this.getCachedQuery<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Execute query
    const result = await this.adapter.query<T>(sql, params, options);

    // Cache result if enabled
    if (options.cache !== false && this.adapter.config.enableQueryCache) {
      this.cacheQuery(
        cacheKey,
        result,
        options.cacheTTL || this.adapter.config.cacheTTL,
      );
    }

    return result;
  }

  /**
   * Execute a command (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params?: unknown[],
  ): Promise<{ changes: number; lastInsertId?: string | number }> {
    const result = await this.adapter.execute(sql, params);

    // Invalidate cache if enabled
    if (this.adapter.config.enableQueryCache) {
      // TODO: Implement smarter cache invalidation based on affected tables
      // For now, we clear the entire cache
      // In production, you'd want to parse the SQL statement
      // and only invalidate related queries
      this.queryCache.clear();
    }

    return {
      changes: result.changes,
      lastInsertId: result.lastInsertId,
    };
  }

  /**
   * Start watching for real-time changes
   */
  watchChanges(
    identifier: string,
    options: StreamOptions,
    callback: (change: unknown) => void,
  ): void {
    if (!this.adapter.createChangeStream) {
      throw new Error("Change streams not supported by this database adapter");
    }

    // Register callback
    if (!this.streamCallbacks.has(identifier)) {
      this.streamCallbacks.set(identifier, []);
    }
    this.streamCallbacks.get(identifier)!.push(callback);

    // Start change stream if not already running
    if (!this.changeStreams.has(identifier)) {
      const stream = this.adapter.createChangeStream(identifier, options);
      this.changeStreams.set(identifier, stream);

      // Process changes
      this.processChangeStream(identifier, stream, options);
    }
  }

  /**
   * Stop watching changes for a specific identifier
   */
  stopWatching(identifier: string, callback?: (change: unknown) => void): void {
    const callbacks = this.streamCallbacks.get(identifier);
    if (callbacks) {
      if (callback) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      } else {
        callbacks.length = 0; // Clear all callbacks
      }

      // Stop stream if no more callbacks
      if (callbacks.length === 0) {
        this.changeStreams.delete(identifier);
        this.streamCallbacks.delete(identifier);
      }
    }
  }

  /**
   * Process change stream with debouncing
   */
  private async processChangeStream(
    identifier: string,
    stream: AsyncIterableIterator<unknown>,
    options: StreamOptions,
  ): Promise<void> {
    let lastChange: unknown = null;
    let debounceTimer: number | null = null;

    for await (const change of stream) {
      const callbacks = this.streamCallbacks.get(identifier);
      if (!callbacks || callbacks.length === 0) {
        break; // No more listeners
      }

      // Debouncing for high-frequency changes
      if (options.debounceMs && options.debounceMs > 0) {
        lastChange = change;

        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          callbacks.forEach((callback) => callback(lastChange));
        }, options.debounceMs);
      } else {
        // Immediate callback
        callbacks.forEach((callback) => callback(change));
      }
    }
  }

  /**
   * Execute within a transaction
   */
  async transaction<T>(
    fn: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    return await this.adapter.transaction(fn);
  }

  /**
   * Get database health status
   */
  async healthCheck(): Promise<boolean> {
    return await this.adapter.health();
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(sql: string, params?: unknown[]): string {
    return `${sql}:${JSON.stringify(params || [])}`;
  }

  /**
   * Get cached query result
   */
  private getCachedQuery<T>(key: string): T[] | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T[];
    }

    if (cached) {
      this.queryCache.delete(key);
    }

    return null;
  }

  /**
   * Cache query result
   */
  private cacheQuery(key: string, data: unknown, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate cache entries related to a SQL operation
   */
  private invalidateRelatedCache(sql: string): void {
    const operation = sql.trim().split(" ")[0].toUpperCase();

    if (
      operation === "INSERT" || operation === "UPDATE" || operation === "DELETE"
    ) {
      // For now, clear all cache on mutations
      // In a more sophisticated implementation, you'd parse the SQL
      // and only invalidate related queries
      this.queryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheSize: number;
    activeStreams: number;
    totalCallbacks: number;
  } {
    return {
      cacheSize: this.queryCache.size,
      activeStreams: this.changeStreams.size,
      totalCallbacks: Array.from(this.streamCallbacks.values())
        .reduce((total, callbacks) => total + callbacks.length, 0),
    };
  }
}

/**
 * Factory function to create database instances
 */
export function createDatabase(config: DatabaseConfig): WebliskDatabase {
  // For now, we only support a basic adapter
  // Users can extend DatabaseAdapter to create their own adapters
  class BasicAdapter extends DatabaseAdapter {
    async connect(): Promise<void> {
      // Implementation would depend on database type
    }

    async disconnect(): Promise<void> {
      // Implementation would depend on database type
    }

    query<T = unknown>(): Promise<T[]> {
      // Implementation would depend on database type
      return Promise.resolve([] as T[]);
    }

    execute(): Promise<DatabaseResult> {
      // Implementation would depend on database type
      return Promise.resolve({ affectedRows: 0, changes: 0 });
    }

    async transaction<T>(
      operations: (tx: DatabaseTransaction) => Promise<T>,
    ): Promise<T> {
      // Implementation would depend on database type
      // For now, just execute without transaction
      const mockTx: DatabaseTransaction = {
        query: this.query.bind(this),
        execute: this.execute.bind(this),
        rollback: async () => {},
        commit: async () => {},
      };
      return await operations(mockTx);
    }

    health(): Promise<boolean> {
      // Implementation would depend on database type
      return Promise.resolve(true);
    }

    async *createChangeStream(): AsyncIterableIterator<unknown> {
      // Implementation would depend on database type
      // This is a placeholder implementation
    }
  }

  const adapter = new BasicAdapter(config);
  return new WebliskDatabase(adapter);
}

/**
 * Real-time database helpers
 */
export const realtimeHelpers = {
  /**
   * Create a change stream query
   */
  createChangeStreamQuery: (
    table: string,
    operations: string[],
  ): { table: string; operations: string[]; timestamp: Date } => {
    return {
      table,
      operations,
      timestamp: new Date(),
    };
  },

  /**
   * Format change event
   */
  formatChangeEvent: (change: unknown): Record<string, unknown> => {
    return {
      ...change as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    };
  },
};
