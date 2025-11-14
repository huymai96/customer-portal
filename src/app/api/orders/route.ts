import { NextRequest, NextResponse } from 'next/server';

import type { DecorationOrderRequest } from '@/lib/types';
import type { CreateDecorationInput, CreateOrderInput } from '@/services/orders/order-service';
import { createDraftOrder } from '@/services/orders/order-service';

function mapDecorationInput(decorations?: DecorationOrderRequest['decorations']): CreateDecorationInput[] {
  if (!decorations || decorations.length === 0) {
    return [];
  }

  return decorations.map((decoration) => {
    const primaryLocation = decoration.locations?.[0]?.name ?? decoration.locations?.[0]?.placementNotes ?? null;
    return {
      lineIndex: decoration.lineIndex,
      method: decoration.method,
      location: primaryLocation ?? undefined,
      colors: decoration.colors,
      notes: decoration.notes,
      proofRequired: decoration.proofRequired,
      metadata: {
        locations: decoration.locations ?? [],
        underbase: decoration.underbase,
        stitchCount: decoration.stitchCount,
        threadPalette: decoration.threadPalette,
        ...decoration.metadata,
      },
      artworks: decoration.artworks?.map((artwork) => ({
        type: artwork.type,
        url: artwork.url,
        metadata: artwork.metadata,
      })),
    };
  });
}

function normalizePayload(payload: DecorationOrderRequest): CreateOrderInput {
  return {
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerCompany: payload.customerCompany,
    notes: payload.notes,
    metadata: payload.metadata,
    lines: payload.lines?.map((line) => ({
      supplierPartId: line.supplierPartId,
      colorCode: line.colorCode,
      sizeCode: line.sizeCode,
      quantity: line.quantity,
      metadata: line.metadata,
    })),
    decorations: mapDecorationInput(payload.decorations),
    artworks: payload.artworks?.map((artwork) => ({
      type: artwork.type,
      url: artwork.url,
      metadata: artwork.metadata,
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as DecorationOrderRequest;
    const input = normalizePayload(payload);
    const order = await createDraftOrder(input);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Failed to create decoration order', error);
    const message = error instanceof Error ? error.message : 'Unable to create order';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

