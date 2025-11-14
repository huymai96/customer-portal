import { NextResponse } from 'next/server';
import { fetchProductWithFallback } from '@/integrations/ssactivewear/service';

export async function GET() {
  try {
    const result = await fetchProductWithFallback('B00060');
    
    return NextResponse.json({
      success: true,
      source: result.source,
      warnings: result.warnings,
      product: {
        id: result.product.id,
        name: result.product.name,
        brand: result.product.brand,
        colorCount: result.product.colors.length,
        sizeCount: result.product.sizes.length,
        mediaCount: result.product.media.length,
        skuCount: result.product.skuMap.length,
        colors: result.product.colors.slice(0, 3), // First 3 colors
        sizes: result.product.sizes.slice(0, 5), // First 5 sizes
      },
      fetchedAt: result.fetchedAt,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

