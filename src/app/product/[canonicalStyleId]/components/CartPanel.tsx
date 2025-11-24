'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SupplierSource } from '@prisma/client';
import { useCart } from '@/contexts/CartContext';

interface CartPanelProps {
  canonicalStyleId: string;
  styleNumber: string;
  displayName: string;
  brand?: string | null;
  supplier: SupplierSource;
  supplierPartId: string;
  selectedColorCode: string;
  selectedColorName: string;
  allSizes: string[];
}

export function CartPanel({
  canonicalStyleId,
  styleNumber,
  displayName,
  brand,
  supplier,
  supplierPartId,
  selectedColorCode,
  selectedColorName,
  allSizes,
}: CartPanelProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalPieces = useMemo(() => {
    return Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0);
  }, [quantities]);

  const handleQuantityChange = (sizeCode: string, value: string) => {
    const parsed = parseInt(value, 10);
    const qty = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setQuantities((prev) => ({ ...prev, [sizeCode]: qty }));
  };

  const handleAddToCart = () => {
    if (totalPieces === 0) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      // Add each size/quantity combination as a separate cart item
      const sizeQuantities = Object.entries(quantities).filter(([, qty]) => qty > 0);

      for (const [sizeCode, quantity] of sizeQuantities) {
        addItem({
          styleNumber,
          productName: displayName,
          supplierPartId,
          canonicalStyleId,
          color: selectedColorCode,
          colorName: selectedColorName,
          size: sizeCode,
          quantity,
          unitPrice: 0, // TODO: Get actual unit price from product data
          decorations: [],
        });
      }

      // Clear quantities and show success
      setQuantities({});
      setSuccessMessage(`Added ${totalPieces} piece${totalPieces === 1 ? '' : 's'} to cart`);
      
      // Auto-redirect to cart after 1 second
      setTimeout(() => {
        router.push('/cart');
      }, 1000);
    } catch (error) {
      console.error('Add to cart error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to cart. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Add to Cart
      </h3>

      {/* Selected Details */}
      <div className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Supplier:</span>
          <span className="font-semibold text-slate-900">
            {supplier === 'SANMAR' ? 'SanMar' : 'S&S Activewear'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Color:</span>
          <span className="font-semibold text-slate-900">{selectedColorName || selectedColorCode}</span>
        </div>
      </div>

      {/* Size Quantity Inputs */}
      {selectedColorCode && allSizes.length > 0 ? (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Quantities by Size
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allSizes.map((sizeCode) => (
              <label key={sizeCode} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{sizeCode}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantities[sizeCode] || ''}
                  onChange={(e) => handleQuantityChange(sizeCode, e.target.value)}
                  placeholder="0"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
          Select a color to add to cart
        </div>
      )}

      {/* Total Pieces */}
      {totalPieces > 0 && (
        <div className="mb-4 rounded-lg bg-brand-50 p-3 text-center">
          <p className="text-sm font-semibold text-brand-700">
            Total: {totalPieces} piece{totalPieces === 1 ? '' : 's'}
          </p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={totalPieces === 0 || isSubmitting}
        className="mb-3 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Adding...' : 'Add to Cart'}
      </button>

      {/* View Cart Link */}
      <Link
        href="/cart"
        className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        View Cart
      </Link>
    </div>
  );
}


