import { NextResponse } from 'next/server';

import { createDraftOrder } from '@/services/orders/order-service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const order = await createDraftOrder({
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerCompany: 'Test Company',
      notes: 'Sample decoration order for testing',
      lines: [
        {
          supplierPartId: 'PC54',
          colorCode: 'BLACK',
          sizeCode: 'L',
          quantity: 24,
        },
        {
          supplierPartId: 'PC54',
          colorCode: 'BLACK',
          sizeCode: 'XL',
          quantity: 12,
        },
      ],
      decorations: [
        {
          method: 'screen',
          location: 'left chest',
          colors: 3,
          proofRequired: true,
          notes: '3-color screen print on left chest',
        },
        {
          method: 'emb',
          location: 'back',
          colors: 1,
          proofRequired: true,
          notes: 'Embroidered logo on back',
        },
      ],
    });

    return NextResponse.json({ status: 'ok', order }, { status: 201 });
  } catch (error) {
    console.error('Test order creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create test order';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

