import { NextRequest, NextResponse } from 'next/server';

import { listCatalogProducts, searchCatalogProducts } from '@/services/catalog-repository';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const query = url.searchParams.get('query');
  if (query && query.trim().length > 0) {
    const items = await searchCatalogProducts(query.trim());
    return NextResponse.json({ items });
  }

  const products = await listCatalogProducts();
  return NextResponse.json({ products });
}
