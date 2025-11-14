import { NextResponse } from 'next/server';

import { createDraftOrder } from '@/services/orders/order-service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // First test: just create an empty order
    const order = await createDraftOrder({
      customerName: 'Test Customer',
    });

    return NextResponse.json({ status: 'ok', order }, { status: 201 });
  } catch (error) {
    console.error('Test order creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create test order';
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ status: 'error', error: message, stack }, { status: 500 });
  }
}

