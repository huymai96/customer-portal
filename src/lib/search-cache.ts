/**
 * Client-side cache for search results and product data
 * Provides fast, local-first UX with configurable TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SearchCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private readonly defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with optional TTL override
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries (garbage collection)
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
const searchCache = new SearchCache();

// Auto-prune every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    searchCache.prune();
  }, 5 * 60 * 1000);
}

export default searchCache;

/**
 * Generate cache key for search queries
 */
export function buildSearchCacheKey(params: {
  query: string;
  suppliers?: string[];
  sort?: string;
  page?: number;
  limit?: number;
  inStockOnly?: boolean;
}): string {
  const parts = [
    'search',
    params.query || '_',
    params.suppliers?.sort().join(',') || 'all',
    params.sort || 'relevance',
    params.page || 1,
    params.limit || 20,
    params.inStockOnly ? 'instock' : 'all',
  ];
  return parts.join(':');
}

/**
 * Generate cache key for product details
 */
export function buildProductCacheKey(productId: string, colorCode?: string): string {
  return `product:${productId}${colorCode ? `:${colorCode}` : ''}`;
}

/**
 * Generate cache key for inventory
 */
export function buildInventoryCacheKey(productId: string, colorCode: string): string {
  return `inventory:${productId}:${colorCode}`;
}

