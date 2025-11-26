/**
 * Cart Page Component
 * 
 * Displays cart items with:
 * - Item details and pricing
 * - Quantity adjustment
 * - Decoration options
 * - Total calculations
 * - Checkout button
 */

'use client';

import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import DecorationForm from './DecorationForm';
import { type CartItemDecoration } from '@/contexts/CartContext';

export default function CartPage() {
  const { items, summary, updateQuantity, removeItem, updateDecorations } = useCart();
  const [decoratingItemId, setDecoratingItemId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Your Cart is Empty</h1>
          <p className="mt-4 text-lg text-slate-600">
            Start shopping to add items to your cart
          </p>
          <Link
            href="/search"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const handleAddDecoration = (itemId: string, decoration: CartItemDecoration) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const existingDecorations = item.decorations || [];
    updateDecorations(itemId, [...existingDecorations, decoration]);
    setDecoratingItemId(null);
  };

  const handleRemoveDecoration = (itemId: string, decorationIndex: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.decorations) return;

    const newDecorations = item.decorations.filter((_, idx) => idx !== decorationIndex);
    updateDecorations(itemId, newDecorations);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900">Shopping Cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                {/* Product Image */}
                {item.imageUrl && (
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.productName}</h3>
                      <p className="text-sm text-slate-600">Style: {item.styleNumber}</p>
                      <p className="text-sm text-slate-600">
                        Color: {item.colorName} | Size: {item.size}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Quantity and Price */}
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-center"
                      />
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  {/* Decorations */}
                  {item.decorations && item.decorations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {item.decorations.map((decoration, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {decoration.description}
                            </p>
                            <p className="text-xs text-slate-600">
                              {decoration.method.replace('_', ' ').toUpperCase()} - {decoration.location}
                              {' | '}
                              ${decoration.unitCost.toFixed(2)}/item
                              {decoration.setupFee > 0 && ` + $${decoration.setupFee.toFixed(2)} setup`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveDecoration(item.id, idx)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Decoration Button */}
                  {decoratingItemId !== item.id && (
                    <button
                      onClick={() => setDecoratingItemId(item.id)}
                      className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      + Add Decoration
                    </button>
                  )}

                  {/* Decoration Form */}
                  {decoratingItemId === item.id && (
                    <div className="mt-4">
                      <DecorationForm
                        quantity={item.quantity}
                        onSave={(decoration) => handleAddDecoration(item.id, decoration)}
                        onCancel={() => setDecoratingItemId(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>

            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal ({summary.itemCount} items)</span>
                <span className="font-medium text-slate-900">${summary.subtotal.toFixed(2)}</span>
              </div>

              {summary.decorationTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Decoration</span>
                  <span className="font-medium text-slate-900">${summary.decorationTotal.toFixed(2)}</span>
                </div>
              )}

              {summary.setupFees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Setup Fees</span>
                  <span className="font-medium text-slate-900">${summary.setupFees.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping</span>
                <span className="font-medium text-slate-900">${summary.shipping.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span className="font-medium text-slate-900">${summary.tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">${summary.total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/quote/submit"
              className="mt-6 block w-full rounded-lg bg-emerald-600 px-6 py-3 text-center text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Submit for Approval
            </Link>
            
            <p className="mt-3 text-center text-xs text-slate-500">
              Your quote will be sent to your account manager for approval
            </p>

            <Link
              href="/search"
              className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

