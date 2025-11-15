import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { countCanonicalStyles, countSupplierProductLinks } from '@/services/canonical-style';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const checks = {
      orders: 0,
      orderLines: 0,
      decorations: 0,
      artworks: 0,
      canonicalStyles: 0,
      supplierLinks: 0,
    };

    try {
      [
        checks.orders,
        checks.orderLines,
        checks.decorations,
        checks.artworks,
        checks.canonicalStyles,
        checks.supplierLinks,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.orderLine.count(),
        prisma.orderDecoration.count(),
        prisma.artworkAsset.count(),
        countCanonicalStyles(prisma),
        countSupplierProductLinks(prisma),
      ]);

      return NextResponse.json({
        status: 'ok',
        message: 'Decoration workflow and canonical style tables exist',
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

