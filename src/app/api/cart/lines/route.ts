import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import type { AddToCartRequestPayload } from '@/lib/types';
import {
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_COOKIE_NAME,
  serializeCart,
  upsertCartLine,
} from '@/services/cart-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AddToCartRequestPayload;
    validatePayload(payload);

    const cookieStore = await cookies();
    const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;

    try {
      const { cart, createdCart } = await upsertCartLine({
        ...payload,
        cartId: existingCartId,
      });

      const serialized = serializeCart(cart);
      const response = NextResponse.json({
        success: true,
        cartId: cart.id,
        createdCart,
        cart: serialized,
      });
      if (createdCart || !existingCartId) {
        response.cookies.set(CART_COOKIE_NAME, cart.id, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: CART_COOKIE_MAX_AGE_SECONDS,
        });
      }
      return response;
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      // Check if this is a "table does not exist" error
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('relation') ||
        errorMessage.includes('table') ||
        errorMessage.includes('Cart')
      ) {
        console.error('[cart] Database schema issue:', errorMessage);
        return NextResponse.json(
          {
            error:
              'Cart functionality is temporarily unavailable due to database configuration. Please contact support.',
          },
          { status: 503 }
        );
      }
      // Re-throw other errors (validation, etc.)
      throw dbError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update cart.';
    const status = message.includes('quantity') || message.includes('required field') ? 400 : 500;
    console.error('[cart] Error processing request:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

function validatePayload(payload: AddToCartRequestPayload) {
  const requiredStrings: Array<keyof AddToCartRequestPayload> = [
    'canonicalStyleId',
    'styleNumber',
    'supplier',
    'supplierPartId',
    'colorCode',
  ];
  for (const field of requiredStrings) {
    const value = payload[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  if (!Array.isArray(payload.sizeQuantities)) {
    throw new Error('sizeQuantities must be an array.');
  }
  // Filter out zero quantities and validate structure
  const validQuantities = payload.sizeQuantities.filter((sq) => {
    if (!sq || typeof sq !== 'object') return false;
    if (typeof sq.sizeCode !== 'string' || sq.sizeCode.trim().length === 0) return false;
    const qty = Number(sq.quantity);
    return Number.isFinite(qty) && qty > 0;
  });
  if (validQuantities.length === 0) {
    throw new Error('At least one size must have quantity greater than zero.');
  }
  // Replace with validated quantities
  payload.sizeQuantities = validQuantities;
}

