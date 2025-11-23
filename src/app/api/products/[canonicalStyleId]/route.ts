import { NextResponse } from 'next/server';

import { getCanonicalProductDetail } from '@/services/product-service';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    canonicalStyleId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { canonicalStyleId } = await context.params;
  const detail = await getCanonicalProductDetail(canonicalStyleId);
  if (!detail) {
    return NextResponse.json({ error: 'Canonical style not found' }, { status: 404 });
  }
  return NextResponse.json(detail);
}


