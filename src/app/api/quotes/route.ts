import { NextRequest, NextResponse } from 'next/server';

import { createQuote } from '@/data/quotes';
import type { QuoteRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  let payload: QuoteRequest;
  try {
    payload = (await request.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const quote = await createQuote(payload);
    return NextResponse.json(quote, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create quote';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
