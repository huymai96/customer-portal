import type {
  ProductRecord,
  InventorySnapshot,
  QuoteRequest,
  QuoteResponse,
  CanonicalSearchOptions,
  CanonicalSearchResponse,
} from '@/lib/types';
import searchCache, {
  buildSearchCacheKey,
  buildProductCacheKey,
  buildInventoryCacheKey,
} from '@/lib/search-cache';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }

  return (await resp.json()) as T;
}

export async function fetchProduct(supplierPartId: string) {
  const cacheKey = buildProductCacheKey(supplierPartId);
  
  // Check cache first
  const cached = searchCache.get<ProductRecord>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const product = await request<ProductRecord>(
    `/api/supplier-products/${encodeURIComponent(supplierPartId)}`
  );
  
  // Cache for 10 minutes
  searchCache.set(cacheKey, product, 10 * 60 * 1000);
  
  return product;
}

export async function fetchInventorySnapshot(supplierPartId: string, colorCode: string) {
  const cacheKey = buildInventoryCacheKey(supplierPartId, colorCode);
  
  // Check cache first
  const cached = searchCache.get<InventorySnapshot>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const params = new URLSearchParams({ color: colorCode });
  const inventory = await request<InventorySnapshot>(
    `/api/supplier-products/${encodeURIComponent(supplierPartId)}/inventory?${params.toString()}`
  );
  
  // Cache for 2 minutes (inventory changes frequently)
  searchCache.set(cacheKey, inventory, 2 * 60 * 1000);
  
  return inventory;
}

export async function submitQuote(payload: QuoteRequest) {
  return request<QuoteResponse>(`/api/quotes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchProducts(query: string, options: CanonicalSearchOptions = {}) {
  const cacheKey = buildSearchCacheKey({
    query,
    suppliers: options.suppliers,
    sort: options.sort,
    page: options.offset ? Math.floor(options.offset / (options.limit || 20)) + 1 : 1,
    limit: options.limit,
    inStockOnly: options.inStockOnly,
  });

  // Check cache first
  const cached = searchCache.get<CanonicalSearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build query params
  const params = new URLSearchParams({ query });
  if (typeof options.limit === 'number') {
    params.set('limit', String(options.limit));
  }
  if (typeof options.offset === 'number') {
    params.set('offset', String(options.offset));
  }
  if (options.sort) {
    params.set('sort', options.sort);
  }
  if (options.inStockOnly) {
    params.set('inStockOnly', 'true');
  }
  if (options.suppliers?.length) {
    for (const supplier of options.suppliers) {
      params.append('supplier', supplier);
    }
  }

  // Fetch from API
  const results = await request<CanonicalSearchResponse>(`/api/products/search?${params.toString()}`);
  
  // Cache for 5 minutes
  searchCache.set(cacheKey, results, 5 * 60 * 1000);
  
  return results;
}

/**
 * Invalidate search cache (e.g., after bulk inventory update)
 */
export function invalidateSearchCache(): void {
  searchCache.clear();
}

/**
 * Invalidate specific product cache
 */
export function invalidateProductCache(supplierPartId: string): void {
  searchCache.delete(buildProductCacheKey(supplierPartId));
}

