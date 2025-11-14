import { NextRequest, NextResponse } from 'next/server';

import { searchCatalogProducts } from '@/services/catalog-repository';
import {
  fetchProductWithFallback,
  isSsActivewearPart,
} from '@/integrations/ssactivewear/service';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const items = await searchCatalogProducts(query);

  if (!items.length && isSsActivewearPart(query)) {
    try {
      const result = await fetchProductWithFallback(query);
      items.push({
        supplierPartId: result.product.supplierPartId,
        name: result.product.name,
        brand: result.product.brand ?? null,
      });
    } catch (error) {
      console.error('SSActivewear search fallback failed', query, error);
    }
  }

  return NextResponse.json({ items });
}
