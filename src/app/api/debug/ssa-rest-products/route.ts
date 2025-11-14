import { NextResponse } from 'next/server';
import { fetchRestProducts } from '@/integrations/ssactivewear/rest-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('id') || 'B00060';
    
    const products = await fetchRestProducts(identifier);
    
    return NextResponse.json({
      identifier,
      productCount: products.length,
      firstProduct: products[0] || null,
      allSkus: products.map(p => p.sku),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

