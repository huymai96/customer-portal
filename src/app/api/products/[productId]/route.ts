import { NextRequest, NextResponse } from 'next/server';

import { getProductBySupplierPartId } from '@/data/catalog';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const supplierPartId = decodeURIComponent(productId);
  const product = getProductBySupplierPartId(supplierPartId);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json(product);
}
