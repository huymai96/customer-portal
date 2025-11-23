import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { CART_COOKIE_NAME, getCartById, serializeCart } from '@/services/cart-service';

export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;

  const cart = cartId ? await getCartById(cartId) : null;
  const payload = serializeCart(cart);

  return NextResponse.json(payload);
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return NextResponse.json({ ok: true });
}

