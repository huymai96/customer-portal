import { NextRequest, NextResponse } from 'next/server';

import { listProducts, searchCatalog } from '@/data/catalog';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const query = url.searchParams.get('query');
  if (query && query.trim().length > 0) {
    const items = searchCatalog(query.trim());
    return NextResponse.json({ items });
  }

  const products = listProducts();
  return NextResponse.json({ products });
}
