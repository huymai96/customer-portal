import { NextRequest, NextResponse } from 'next/server';

import { getInventorySnapshot } from '@/data/catalog';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const supplierPartId = decodeURIComponent(productId);
  const colorCode = request.nextUrl.searchParams.get('color');
  if (!colorCode) {
    return NextResponse.json({ error: 'Missing color' }, { status: 400 });
  }

  const snapshot = getInventorySnapshot(supplierPartId, colorCode);
  if (!snapshot) {
    return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
