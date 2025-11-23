/**
 * API Route Handler: Get Order Status
 * GET /api/orders/[orderId]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus } from '@/lib/orders/service';
import { getApiErrorMessage } from '@/lib/api/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // TODO: Add proper authentication middleware
    
    const orderId = params.orderId;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order status from API-Docs
    const result = await getOrderStatus(orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get order status error:', error);
    
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
