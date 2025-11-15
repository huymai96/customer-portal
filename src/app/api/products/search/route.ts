import { SupplierSource } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { searchCanonicalStyles } from '@/services/search-service';

const SORT_OPTIONS = new Set(['relevance', 'supplier', 'price', 'stock'] as const);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);
  const offset = Number.parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);
  const sortParam =
    (request.nextUrl.searchParams.get('sort') as 'relevance' | 'supplier' | 'price' | 'stock' | null) ??
    undefined;
  const sort = sortParam && SORT_OPTIONS.has(sortParam) ? sortParam : 'relevance';

  const inStockOnlyParam = request.nextUrl.searchParams.get('inStockOnly');
  const inStockOnly =
    inStockOnlyParam === 'true' || inStockOnlyParam === '1' || inStockOnlyParam === 'yes';

  const supplierFilters = request.nextUrl.searchParams.getAll('supplier');
  const suppliers = supplierFilters
    .map((value) => value.toUpperCase())
    .filter((value): value is SupplierSource => value === 'SANMAR' || value === 'SSACTIVEWEAR');

  const { items, total } = await searchCanonicalStyles(query, {
    limit,
    offset,
    suppliers,
    sort,
    inStockOnly,
  });
  return NextResponse.json({ items, meta: { limit, offset, count: items.length, total } });
}
