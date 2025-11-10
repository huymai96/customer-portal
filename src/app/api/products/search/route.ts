import { NextRequest, NextResponse } from 'next/server';

import { searchCatalog } from '@/data/catalog';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ items: [] });
  }
  const items = searchCatalog(query);
  return NextResponse.json({ items });
}
