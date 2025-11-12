import { NextRequest, NextResponse } from 'next/server';

import { searchCatalogProducts } from '@/services/catalog-repository';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ items: [] });
  }
  const items = await searchCatalogProducts(query);
  return NextResponse.json({ items });
}
