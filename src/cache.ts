/**
 * Weblisk Framework - Real-time Optimized Caching System
    const getTypeStructure = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return typeof obj;
      if (Array.isArray(obj)) {
        return obj.length > 0 ? [getTypeStructure(obj[0])] : [];
      }
      if (typeof obj === "object") {
        const structure: Record<string, unknown> = {};sed on structure caching rather than data caching for real-time applications
 */

export interface CacheConfig {
  enableStructureCache: boolean;
  enableTemplateCache: boolean;
  enableStyleCache: boolean;
  maxCacheSize: number;
  ttl: number; // Time to live in milliseconds
}

export interface CachedStructure {
  template: string;
  styles: string;
  clientCode: string;
  timestamp: number;
  hash: string;
}

/**
 * Real-time optimized cache focused on HTML/CSS structure, not dynamic data
 */
export class WebliskCache {
  private structureCache = new Map<string, CachedStructure>();
  private templateCache = new Map<
    string,
    { template: string; timestamp: number }
  >();
  private styleCache = new Map<string, { styles: string; timestamp: number }>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enableStructureCache: true,
      enableTemplateCache: true,
      enableStyleCache: true,
      maxCacheSize: 1000,
      ttl: 60000, // 1 minute - short TTL for real-time apps
      ...config,
    };
  }

  /**
   * Generate cache key based on route and structure hash
   * This ignores dynamic data, focusing only on structure
   */
  private generateStructureKey(
    routePath: string,
    dataStructure: Record<string, unknown>,
  ): string {
    // Create a structure signature ignoring actual data values
    const structureSignature = this.getDataStructureSignature(dataStructure);
    return `${routePath}:${structureSignature}`;
  }

  /**
   * Get data structure signature for caching (ignore actual values)
   * This allows us to cache based on data shape, not content
   */
  private getDataStructureSignature(data: Record<string, unknown>): string {
    const getTypeStructure = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.length > 0 ? [getTypeStructure(obj[0])] : [];
      }
      if (typeof obj === "object") {
        const structure: Record<string, unknown> = {};
        for (const key in obj as Record<string, unknown>) {
          structure[key] = getTypeStructure(
            (obj as Record<string, unknown>)[key],
          );
        }
        return structure;
      }
      return typeof obj;
    };

    return JSON.stringify(getTypeStructure(data));
  }

  /**
   * Cache rendered structure for reuse
   */
  cacheStructure(
    routePath: string,
    dataStructure: Record<string, unknown>,
    rendered: CachedStructure,
  ): void {
    if (!this.config.enableStructureCache) return;

    const key = this.generateStructureKey(routePath, dataStructure);

    // Cleanup old entries if cache is full
    if (this.structureCache.size >= this.config.maxCacheSize) {
      this.cleanupExpiredStructures();
    }

    this.structureCache.set(key, {
      ...rendered,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached structure if available and valid
   */
  getCachedStructure(
    routePath: string,
    dataStructure: Record<string, unknown>,
  ): CachedStructure | null {
    if (!this.config.enableStructureCache) return null;

    const key = this.generateStructureKey(routePath, dataStructure);
    const cached = this.structureCache.get(key);

    if (cached && this.isValidCache(cached.timestamp)) {
      return cached;
    }

    // Remove expired entry
    if (cached) {
      this.structureCache.delete(key);
    }

    return null;
  }

  /**
   * Cache template separately for partial updates
   */
  cacheTemplate(key: string, template: string): void {
    if (!this.config.enableTemplateCache) return;

    this.templateCache.set(key, {
      template,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached template
   */
  getCachedTemplate(key: string): string | null {
    if (!this.config.enableTemplateCache) return null;

    const cached = this.templateCache.get(key);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.template;
    }

    if (cached) {
      this.templateCache.delete(key);
    }

    return null;
  }

  /**
   * Cache styles separately
   */
  cacheStyles(key: string, styles: string): void {
    if (!this.config.enableStyleCache) return;

    this.styleCache.set(key, {
      styles,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached styles
   */
  getCachedStyles(key: string): string | null {
    if (!this.config.enableStyleCache) return null;

    const cached = this.styleCache.get(key);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.styles;
    }

    if (cached) {
      this.styleCache.delete(key);
    }

    return null;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.ttl;
  }

  /**
   * Clean up expired structure cache entries
   */
  private cleanupExpiredStructures(): void {
    const now = Date.now();
    for (const [key, cached] of this.structureCache.entries()) {
      if (now - cached.timestamp >= this.config.ttl) {
        this.structureCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.structureCache.clear();
    this.templateCache.clear();
    this.styleCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    structureCache: { size: number; maxSize: number };
    templateCache: { size: number };
    styleCache: { size: number };
    config: CacheConfig;
  } {
    return {
      structureCache: {
        size: this.structureCache.size,
        maxSize: this.config.maxCacheSize,
      },
      templateCache: {
        size: this.templateCache.size,
      },
      styleCache: {
        size: this.styleCache.size,
      },
      config: this.config,
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global cache instance
export const webliskCache: WebliskCache = new WebliskCache();
