'use client';

/**
 * Order Submission Modal
 * 
 * Confirms order details and submits to the API.
 * Shows pricing breakdown, decoration specs, and customer info.
 */

import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { DecorationOrderRequest } from '@/lib/types';
import { calculateDecorationPricing, formatCurrency } from '@/lib/decoration-pricing';

interface OrderSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: DecorationOrderRequest;
  onSuccess: (orderId: string) => void;
}

export function OrderSubmissionModal({
  isOpen,
  onClose,
  orderData,
  onSuccess,
}: OrderSubmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit order');
      }

      const result = await response.json();
      onSuccess(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total pricing
  const totalQuantity = orderData.lines?.reduce((sum, line) => sum + line.quantity, 0) || 0;
  const decorationPricing = orderData.decorations?.[0]
    ? calculateDecorationPricing({
        method: orderData.decorations[0].method,
        colors: orderData.decorations[0].colors || 1,
        locations: 1,
        quantity: totalQuantity,
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Review & Submit Order</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                {orderData.customerName && (
                  <p><span className="font-medium">Name:</span> {orderData.customerName}</p>
                )}
                {orderData.customerEmail && (
                  <p><span className="font-medium">Email:</span> {orderData.customerEmail}</p>
                )}
                {orderData.customerCompany && (
                  <p><span className="font-medium">Company:</span> {orderData.customerCompany}</p>
                )}
              </div>
            </div>

            {/* Order Lines */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Order Items</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {orderData.lines?.map((line, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {line.supplierPartId} - {line.colorCode} / {line.sizeCode}
                    </span>
                    <span className="font-medium">Qty: {line.quantity}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Quantity</span>
                    <span>{totalQuantity} units</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorations */}
            {orderData.decorations && orderData.decorations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Decoration Details</h3>
                {orderData.decorations.map((decoration, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Method:</span> {decoration.method.toUpperCase()}</p>
                    {decoration.locations && decoration.locations.length > 0 && (
                      <p><span className="font-medium">Locations:</span> {decoration.locations.map(l => l.name).join(', ')}</p>
                    )}
                    {decoration.colors && (
                      <p><span className="font-medium">Colors:</span> {decoration.colors}</p>
                    )}
                    {decoration.notes && (
                      <p><span className="font-medium">Notes:</span> {decoration.notes}</p>
                    )}
                    {decoration.artworks && decoration.artworks.length > 0 && (
                      <div>
                        <span className="font-medium">Artwork Files:</span>
                        <ul className="mt-1 space-y-1 ml-4">
                          {decoration.artworks.map((artwork, artIndex) => (
                            <li key={artIndex} className="text-xs text-gray-600">
                              • {artwork.url}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pricing Breakdown */}
            {decorationPricing && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Pricing Estimate</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {decorationPricing.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total Decoration Cost</span>
                      <span>{formatCurrency(decorationPricing.totalCost)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Garment costs not included. Final pricing subject to review.
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {orderData.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Special Instructions</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                  {orderData.notes}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Submit Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

