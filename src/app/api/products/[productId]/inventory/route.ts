import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { getSanmarInventorySnapshot, getStoredInventorySnapshot } from '@/services/sanmar/inventory';
import {
  buildColorInventorySnapshot,
  fetchInventoryWithFallback,
  isSsActivewearPart,
} from '@/integrations/ssactivewear/service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const supplierPartId = decodeURIComponent(productId).trim();
  const colorCode = request.nextUrl.searchParams.get('color');
  if (!colorCode) {
    return NextResponse.json({ error: 'Missing color' }, { status: 400 });
  }

  const normalizedId = supplierPartId.toUpperCase();
  const normalizedColor = colorCode.trim().toUpperCase();

  if (isSsActivewearPart(normalizedId)) {
    try {
      const result = await fetchInventoryWithFallback(normalizedId);
      const snapshot = buildColorInventorySnapshot(result.inventory, normalizedColor);
      return NextResponse.json(snapshot, {
        headers: {
          'x-ssactivewear-source': result.source,
          ...(result.warnings ? { 'x-ssactivewear-warnings': result.warnings.join(' | ') } : {}),
        },
      });
    } catch (error) {
      console.error(
        'Failed to load SSActivewear inventory',
        normalizedId,
        normalizedColor,
        error
      );
      return NextResponse.json(
        { error: 'Unable to load SSActivewear inventory' },
        { status: 502 }
      );
    }
  }

  try {
    const snapshot = await getSanmarInventorySnapshot(supplierPartId, colorCode);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('SanMar inventory fetch failed', error);

    try {
      const fallback = await getStoredInventorySnapshot(supplierPartId, colorCode);
      if (fallback) {
        return NextResponse.json(fallback);
      }
    } catch (fallbackError) {
      console.error('Stored inventory fallback failed', fallbackError);
    }

    const message = error instanceof Error ? error.message : 'Inventory lookup failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
