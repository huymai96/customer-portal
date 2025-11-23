import { Prisma, SupplierSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type {
  AddToCartRequestPayload,
  CartResponsePayload,
  CartSizeQuantity,
  PersistentCartLine,
} from '@/lib/types';

export const CART_COOKIE_NAME = 'promos_cart_id';
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type CartWithLines = Prisma.CartGetPayload<{ include: { lines: true } }>;

export async function getCartById(cartId: string): Promise<CartWithLines | null> {
  if (!cartId) {
    return null;
  }
  try {
    return await prisma.cart.findUnique({
      where: { id: cartId },
      include: { lines: { orderBy: { createdAt: 'asc' } } },
    });
  } catch (error) {
    // If Cart table doesn't exist, try to get lines directly by cartId
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table')) {
      console.warn('[cart] Cart table does not exist, querying CartLine directly');
      try {
        const lines = await prisma.cartLine.findMany({
          where: { cartId },
          orderBy: { createdAt: 'asc' },
        });
        // Return synthetic cart structure
        return {
          id: cartId,
          status: 'ACTIVE' as const,
          userId: null,
          companyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lines,
        } as CartWithLines;
      } catch (lineError) {
        console.error('[cart] Failed to query CartLine:', lineError instanceof Error ? lineError.message : String(lineError));
        return null;
      }
    }
    throw error;
  }
}

export async function clearCart(cartId: string): Promise<void> {
  if (!cartId) {
    return;
  }
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      lines: {
        deleteMany: {},
      },
      status: 'ARCHIVED',
    },
  });
}

export interface CartLineInput extends AddToCartRequestPayload {
  cartId?: string | null;
}

export async function upsertCartLine(input: CartLineInput): Promise<{
  cart: CartWithLines;
  createdCart: boolean;
}> {
  const normalized = normalizeQuantities(input.sizeQuantities);
  if (!normalized.length) {
    throw new Error('At least one size must have quantity greater than zero.');
  }

  const { cart, created } = await ensureCart(input.cartId);
  const supplierEnum = input.supplier as SupplierSource;

  const existing = await prisma.cartLine.findFirst({
    where: {
      cartId: cart.id,
      supplierPartId: input.supplierPartId,
      colorCode: input.colorCode,
    },
  });

  if (existing) {
    const previous: CartSizeQuantity[] = Array.isArray(existing.sizeQuantities)
      ? (existing.sizeQuantities as unknown as CartSizeQuantity[])
      : [];
    const merged = mergeQuantities(previous, normalized);
    await prisma.cartLine.update({
      where: { id: existing.id },
      data: {
        canonicalStyleId: input.canonicalStyleId,
        canonicalStyleNumber: input.styleNumber,
        displayName: input.displayName,
        brand: input.brand,
        supplier: supplierEnum,
        sizeQuantities: merged as unknown as Prisma.JsonArray,
      },
    });
  } else {
    await prisma.cartLine.create({
      data: {
        cartId: cart.id,
        canonicalStyleId: input.canonicalStyleId,
        canonicalStyleNumber: input.styleNumber,
        displayName: input.displayName,
        brand: input.brand,
        supplier: supplierEnum,
        supplierPartId: input.supplierPartId,
        colorCode: input.colorCode,
        colorName: input.colorName,
        sizeQuantities: normalized as unknown as Prisma.JsonArray,
      },
    });
  }

  // Try to refresh cart, but handle gracefully if Cart table doesn't exist
  let refreshed: CartWithLines | null = null;
  try {
    refreshed = await getCartById(cart.id);
  } catch (error) {
    console.warn('[cart] Could not refresh cart, using current state:', error instanceof Error ? error.message : String(error));
    // If we can't refresh, try to get lines directly
    try {
      const lines = await prisma.cartLine.findMany({
        where: { cartId: cart.id },
        orderBy: { createdAt: 'asc' },
      });
      refreshed = {
        ...cart,
        lines,
      };
    } catch {
      // If even CartLine fails, return the cart we have
      refreshed = cart;
    }
  }
  
  if (!refreshed) {
    // Last resort: return the cart we have with empty lines
    refreshed = cart;
  }
  
  return { cart: refreshed, createdCart: created };
}

export function serializeCart(cart: CartWithLines | null): CartResponsePayload {
  if (!cart) {
    return { cartId: null, lines: [] };
  }
  return {
    cartId: cart.id,
    lines: cart.lines.map<PersistentCartLine>((line) => {
      const sizeQuantities: CartSizeQuantity[] = Array.isArray(line.sizeQuantities)
        ? (line.sizeQuantities as unknown as CartSizeQuantity[])
        : [];
      return {
        id: line.id,
        canonicalStyleId: line.canonicalStyleId,
        styleNumber: line.canonicalStyleNumber,
        displayName: line.displayName,
        brand: line.brand ?? undefined,
        supplier: line.supplier,
        supplierPartId: line.supplierPartId,
        colorCode: line.colorCode,
        colorName: line.colorName ?? undefined,
        sizeQuantities: sizeQuantities.map((entry) => ({
          sizeCode: entry.sizeCode,
          quantity: entry.quantity,
        })),
      };
    }),
  };
}

async function ensureCart(cartId?: string | null): Promise<{ cart: CartWithLines; created: boolean }> {
  // Try to use existing cart if provided
  if (cartId) {
    try {
      const existing = await getCartById(cartId);
      if (existing) {
        return { cart: existing, created: false };
      }
    } catch (error) {
      // If Cart table doesn't exist, fall through to create or use cookie-based approach
      console.warn('[cart] Cart table may not exist, using fallback:', error instanceof Error ? error.message : String(error));
    }
  }

  // Try to create a new cart
  try {
    const created = await prisma.cart.create({
      data: {},
      include: { lines: true },
    });
    return { cart: created, created: true };
  } catch (error) {
    // If Cart table doesn't exist, use cookie cartId directly for CartLine lookups
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table')) {
      console.warn('[cart] Cart table does not exist, using cookie-based cartId for CartLine operations');
      // Use the cookie cartId as a synthetic cart ID
      const syntheticCartId = cartId || `cookie-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      // Return a minimal cart structure that works with CartLine operations
      return {
        cart: {
          id: syntheticCartId,
          status: 'ACTIVE' as const,
          userId: null,
          companyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lines: [],
        } as CartWithLines,
        created: false,
      };
    }
    throw error;
  }
}

function normalizeQuantities(entries: CartSizeQuantity[]): CartSizeQuantity[] {
  const normalized = entries
    .map((entry) => ({
      sizeCode: entry.sizeCode.trim().toUpperCase(),
      quantity: Number(entry.quantity) || 0,
    }))
    .filter((entry) => entry.sizeCode.length > 0 && entry.quantity > 0);

  const merged = new Map<string, number>();
  for (const entry of normalized) {
    merged.set(entry.sizeCode, (merged.get(entry.sizeCode) ?? 0) + entry.quantity);
  }
  return Array.from(merged.entries()).map(([sizeCode, quantity]) => ({ sizeCode, quantity }));
}

function mergeQuantities(
  existing: CartSizeQuantity[] | null | undefined,
  incoming: CartSizeQuantity[]
): CartSizeQuantity[] {
  const merged = new Map<string, number>();
  for (const entry of existing ?? []) {
    merged.set(entry.sizeCode, entry.quantity);
  }
  for (const entry of incoming) {
    merged.set(entry.sizeCode, (merged.get(entry.sizeCode) ?? 0) + entry.quantity);
  }
  return Array.from(merged.entries())
    .map(([sizeCode, quantity]) => ({ sizeCode, quantity }))
    .filter((entry) => entry.quantity > 0);
}

