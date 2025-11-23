/**
 * Order Confirmation Page
 * 
 * Displays order details and status after successful submission
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatOrderStatus, getOrderStatusColor, type OrderStatusResponse } from '@/lib/orders/service';

export default function OrderConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const isSuccess = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<OrderStatusResponse['order'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load order');
        }

        setOrder(result.order);
      } catch (err) {
        console.error('Failed to load order:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-lg text-slate-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <h1 className="text-2xl font-bold text-red-900">Error Loading Order</h1>
          <p className="mt-2 text-red-700">{error || 'Order not found'}</p>
          <Link
            href="/search"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Return to Shopping
          </Link>
        </div>
      </div>
    );
  }

  const statusColor = getOrderStatusColor(order.status);
  const statusColorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Success Banner */}
      {isSuccess && (
        <div className="mb-8 rounded-lg bg-green-50 border border-green-200 p-6">
          <div className="flex items-center">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-green-900">Order Placed Successfully!</h2>
              <p className="mt-1 text-green-700">
                Thank you for your order. We&apos;ll send you updates as your order progresses.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Order {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusColorClasses[statusColor as keyof typeof statusColorClasses] || statusColorClasses.gray}`}>
            {formatOrderStatus(order.status)}
          </span>
        </div>

        {/* Tracking Information */}
        {order.trackingNumber && (
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900">Tracking Information</h3>
            <p className="mt-1 text-sm text-blue-700">
              Tracking Number: <span className="font-mono font-semibold">{order.trackingNumber}</span>
            </p>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Track Package →
              </a>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Order Items</h2>
          <div className="mt-4 space-y-4">
            {order.items?.map((item: {
              productName: string;
              colorName: string;
              size: string;
              quantity: number;
              unitPrice: number;
              decorations?: Array<{ description: string; method: string }>;
            }, idx: number) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{item.productName}</h3>
                  <p className="text-sm text-slate-600">
                    {item.colorName} | {item.size} | Qty: {item.quantity}
                  </p>
                  {item.decorations && item.decorations.length > 0 && (
                    <div className="mt-2">
                      {item.decorations.map((dec, decIdx) => (
                        <p key={decIdx} className="text-xs text-slate-500">
                          + {dec.description} ({dec.method})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="flex justify-between text-2xl font-bold">
            <span className="text-slate-900">Total</span>
            <span className="text-blue-600">${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-900">Order Notes</h3>
            <p className="mt-2 text-sm text-slate-600">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/search"
          className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-center text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue Shopping
        </Link>
        <Link
          href="/orders"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          View All Orders
        </Link>
      </div>
    </div>
  );
}

