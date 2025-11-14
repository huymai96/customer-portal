import { NextResponse } from 'next/server';
import { getProduct } from '@/integrations/ssactivewear/product-data';

export async function GET() {
  try {
    const xml = await getProduct({ productId: 'B00060' });
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

