import type { ProductRecord, InventorySnapshot, QuoteRequest, QuoteResponse } from '@/lib/types';

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

export async function searchProducts(query: string) {
  const params = new URLSearchParams({ query });
  return request<{ items: Array<{ supplierPartId: string; name: string; brand: string }> }>(
    `/api/products/search?${params.toString()}`
  );
}


