import { NextRequest, NextResponse } from 'next/server';

import { getProductBySupplierPartId } from '@/services/catalog-repository';
import {
  fetchProductWithFallback,
  isSsActivewearPart,
} from '@/integrations/ssactivewear/service';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const supplierPartId = decodeURIComponent(productId).trim();
  const normalizedId = supplierPartId.toUpperCase();

  if (isSsActivewearPart(normalizedId)) {
    try {
      const result = await fetchProductWithFallback(normalizedId);
      return NextResponse.json(result.product, {
        headers: {
          'x-ssactivewear-source': result.source,
          ...(result.warnings ? { 'x-ssactivewear-warnings': result.warnings.join(' | ') } : {}),
        },
      });
    } catch (error) {
      console.error('Failed to load SSActivewear product', normalizedId, error);
      return NextResponse.json(
        { error: 'Unable to load SSActivewear product' },
        { status: 502 }
      );
    }
  }

  const product = await getProductBySupplierPartId(normalizedId);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}
