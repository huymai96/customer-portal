import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orders/[orderId]
 * Retrieve a single order with all related data
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            decorations: {
              include: {
                artworks: true,
              },
            },
          },
        },
        decorations: {
          include: {
            artworks: true,
            line: true,
          },
        },
        artworks: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[orderId]
 * Update order status or other fields
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = await request.json();

    const { status, notes, metadata } = body;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(metadata !== undefined && { metadata }),
      },
      include: {
        lines: {
          include: {
            decorations: {
              include: {
                artworks: true,
              },
            },
          },
        },
        decorations: {
          include: {
            artworks: true,
            line: true,
          },
        },
        artworks: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

