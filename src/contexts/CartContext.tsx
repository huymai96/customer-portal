/**
 * Shopping Cart Context and State Management
 * 
 * Provides global cart state for the application with:
 * - Add/remove/update items
 * - Decoration options per item
 * - Automatic price calculations
 * - Persistent storage (localStorage)
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type OrderDecoration } from '@/lib/orders/service';

// ============================================
// TYPES
// ============================================

export interface CartItemDecoration {
  method: 'screen_print' | 'embroidery' | 'dtg';
  location: string;
  description: string;
  artworkUrl?: string;
  colors?: number;
  stitches?: number;
  width?: number;
  height?: number;
  setupFee: number;
  unitCost: number;
}

export interface CartItem {
  id: string; // Unique cart item ID
  styleNumber: string;
  productName: string;
  supplierPartId: string;
  canonicalStyleId: string;
  color: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  decorations?: CartItemDecoration[];
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  decorationTotal: number;
  setupFees: number;
  shipping: number;
  tax: number;
  total: number;
}

interface CartContextType {
  items: CartItem[];
  summary: CartSummary;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateDecorations: (itemId: string, decorations: CartItemDecoration[]) => void;
  clearCart: () => void;
  getItem: (itemId: string) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================
// CART PROVIDER
// ============================================

const CART_STORAGE_KEY = 'promos-ink-cart';
const TAX_RATE = 0.10; // 10% tax rate (adjust as needed)
const SHIPPING_COST = 25.00; // Flat shipping (can be dynamic later)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>({
    itemCount: 0,
    subtotal: 0,
    decorationTotal: 0,
    setupFees: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Use setTimeout to avoid setState during render
        const timer = setTimeout(() => {
          setItems(parsed);
        }, 0);
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [items]);

  // Recalculate summary whenever items change
  useEffect(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    let subtotal = 0;
    let decorationTotal = 0;
    let setupFees = 0;

    items.forEach((item) => {
      subtotal += item.unitPrice * item.quantity;

      if (item.decorations && item.decorations.length > 0) {
        item.decorations.forEach((decoration) => {
          decorationTotal += decoration.unitCost * item.quantity;
          setupFees += decoration.setupFee;
        });
      }
    });

    const shipping = itemCount > 0 ? SHIPPING_COST : 0;
    const tax = (subtotal + decorationTotal + setupFees + shipping) * TAX_RATE;
    const total = subtotal + decorationTotal + setupFees + shipping + tax;

    // Use setTimeout to avoid setState during render
    const timer = setTimeout(() => {
      setSummary({
        itemCount,
        subtotal,
        decorationTotal,
        setupFees,
        shipping,
        tax,
        total,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = `${item.supplierPartId}-${item.color}-${item.size}-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, id }]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  }, [removeItem]);

  const updateDecorations = useCallback((itemId: string, decorations: CartItemDecoration[]) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, decorations } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItem = useCallback(
    (itemId: string) => {
      return items.find((item) => item.id === itemId);
    },
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        addItem,
        removeItem,
        updateQuantity,
        updateDecorations,
        clearCart,
        getItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

