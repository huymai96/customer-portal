import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { getSanmarInventorySnapshot } from '@/services/sanmar/inventory';

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

  try {
    const snapshot = await getSanmarInventorySnapshot(supplierPartId, colorCode);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('SanMar inventory fetch failed', error);
    const message = error instanceof Error ? error.message : 'Inventory lookup failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
