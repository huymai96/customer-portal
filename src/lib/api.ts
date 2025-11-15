import type {
  ProductRecord,
  InventorySnapshot,
  QuoteRequest,
  QuoteResponse,
  CanonicalSearchOptions,
  CanonicalSearchResponse,
} from '@/lib/types';

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
  return request<ProductRecord>(`/api/products/${encodeURIComponent(supplierPartId)}`);
}

export async function fetchInventorySnapshot(supplierPartId: string, colorCode: string) {
  const params = new URLSearchParams({ color: colorCode });
  return request<InventorySnapshot>(
    `/api/products/${encodeURIComponent(supplierPartId)}/inventory?${params.toString()}`
  );
}

export async function submitQuote(payload: QuoteRequest) {
  return request<QuoteResponse>(`/api/quotes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchProducts(query: string, options: CanonicalSearchOptions = {}) {
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

  return request<CanonicalSearchResponse>(`/api/products/search?${params.toString()}`);
}


