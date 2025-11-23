import { SupplierSource } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getSupplierProductBundle } from '@/lib/server-api';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const supplierPartId = decodeURIComponent(productId).trim();

  const bundle = await getSupplierProductBundle(supplierPartId);
  if (!bundle.primaryProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const headers: Record<string, string> = {};
  if (bundle.primarySupplier === SupplierSource.SSACTIVEWEAR) {
    const meta = bundle.metadata[SupplierSource.SSACTIVEWEAR];
    if (meta?.source) {
      headers['x-ssactivewear-source'] = meta.source;
    }
    if (meta?.warnings?.length) {
      headers['x-ssactivewear-warnings'] = meta.warnings.join(' | ');
    }
  }

  return NextResponse.json(bundle.primaryProduct, {
    headers: Object.keys(headers).length ? headers : undefined,
  });
}

