/**
 * API Route Handler: List Orders
 * GET /api/orders/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/orders/service';
import { getApiErrorMessage } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication middleware
    
    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Get orders from API-Docs
    const result = await getOrders(page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get orders error:', error);
    
    const errorMessage = getApiErrorMessage(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
