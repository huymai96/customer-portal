import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const checks = {
      orders: 0,
      orderLines: 0,
      decorations: 0,
      artworks: 0,
    };

    try {
      checks.orders = await prisma.order.count();
      checks.orderLines = await prisma.orderLine.count();
      checks.decorations = await prisma.orderDecoration.count();
      checks.artworks = await prisma.artworkAsset.count();

      return NextResponse.json({
        status: 'ok',
        message: 'All decoration workflow tables exist',
        counts: checks,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      if (message.includes('does not exist')) {
        return NextResponse.json({
          status: 'missing_tables',
          message: 'Decoration workflow tables do not exist. Migration may not have been applied.',
          error: message,
        }, { status: 503 });
      }

      throw error;
    }
  } catch (error) {
    console.error('Schema check failed:', error);
    const message = error instanceof Error ? error.message : 'Schema check failed';
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

