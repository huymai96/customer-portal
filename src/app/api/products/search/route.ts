import { SupplierSource } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { findExactCanonicalStyleMatch, searchCanonicalStyles } from '@/services/search-service';

export const runtime = 'nodejs';

const SORT_OPTIONS = new Set(['relevance', 'supplier', 'price', 'stock'] as const);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (query === 'ping') {
    return NextResponse.json({ ok: true, message: 'search route is alive' });
  }
  if (!query) {
    return NextResponse.json({ items: [] });
  }

  console.log('[search] start', { query });

  try {
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

    const exactMatch = await findExactCanonicalStyleMatch(query, suppliers);
    if (exactMatch) {
      console.log('[search] direct hit', {
        query,
        canonicalStyleId: exactMatch.canonicalStyleId,
      });
      return NextResponse.json({
        items: [exactMatch],
        meta: {
          limit,
          offset,
          count: 1,
          total: 1,
          directHit: true,
        },
      });
    }

    console.log('[search] calling searchCanonicalStyles');
    const { items, total } = await searchCanonicalStyles(query, {
      limit,
      offset,
      suppliers,
      sort,
      inStockOnly,
    });
    console.log('[search] done', { count: items.length, total });

    return NextResponse.json({
      items,
      meta: { limit, offset, count: items.length, total, directHit: false },
    });
  } catch (error) {
    console.error('[search] error', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
