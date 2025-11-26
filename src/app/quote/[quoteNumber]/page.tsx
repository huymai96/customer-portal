/**
 * Quote Confirmation/Status Page
 * 
 * Shows quote details and status to customers
 */

'use client';

import React, { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface QuoteItem {
  id: string;
  styleNumber: string;
  productName: string;
  colorCode: string;
  colorName?: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
  decorations?: Array<{
    method: string;
    location: string;
    description?: string;
    unitCost: number;
    setupFee: number;
  }>;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  customer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  accountManager?: {
    name?: string;
    email?: string;
  };
  shippingAddress?: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: QuoteItem[];
  pricing: {
    subtotal: number;
    decorationTotal: number;
    setupFees: number;
    shipping: number;
    tax: number;
    total: number;
  };
  notes?: string;
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  expiresAt?: string;
}

const statusConfig = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '⏳',
    description: 'Your quote is being reviewed by your account manager.',
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅',
    description: 'Your quote has been approved! Your order is being processed.',
  },
  REJECTED: {
    label: 'Not Approved',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: '❌',
    description: 'Your quote was not approved. See details below.',
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: '⏰',
    description: 'This quote has expired. Please submit a new quote.',
  },
  CONVERTED: {
    label: 'Order Placed',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '📦',
    description: 'This quote has been converted to an order.',
  },
};

export default function QuoteDetailPage({ params }: { params: Promise<{ quoteNumber: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get('submitted') === 'true';
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      try {
        // In a real app, we'd have an API to fetch by quote number
        // For now, we'll show a placeholder
        const response = await fetch(`/api/quotes/by-number/${resolvedParams.quoteNumber}`);
        if (response.ok) {
          const data = await response.json();
          setQuote(data.quote);
        } else {
          // For demo, create a mock quote
          setQuote({
            id: '1',
            quoteNumber: resolvedParams.quoteNumber,
            status: 'PENDING_APPROVAL',
            customer: {
              name: 'Customer',
              email: 'customer@example.com',
            },
            items: [],
            pricing: {
              subtotal: 0,
              decorationTotal: 0,
              setupFees: 0,
              shipping: 0,
              tax: 0,
              total: 0,
            },
            submittedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to fetch quote:', err);
        setError('Failed to load quote details');
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
  }, [resolvedParams.quoteNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Quote Not Found</h1>
        <p className="mt-4 text-slate-600">{error || 'The quote you&apos;re looking for doesn&apos;t exist.'}</p>
        <Link href="/search" className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
          Browse Products
        </Link>
      </div>
    );
  }

  const status = statusConfig[quote.status];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Success Banner (if just submitted) */}
      {justSubmitted && (
        <div className="mb-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold">Quote Submitted Successfully!</h2>
              <p className="mt-1 text-emerald-100">
                Your account manager will review your quote and you&apos;ll receive an email once it&apos;s approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quote Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quote {quote.quoteNumber}</h1>
            <p className="mt-1 text-slate-600">
              Submitted on {new Date(quote.submittedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium ${status.color}`}>
            <span>{status.icon}</span>
            <span>{status.label}</span>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg text-slate-700">{status.description}</p>
        
        {quote.status === 'REJECTED' && quote.rejectionReason && (
          <div className="mt-4 rounded-lg bg-slate-50 border-l-4 border-slate-400 p-4">
            <p className="font-medium text-slate-700">Reason:</p>
            <p className="mt-1 text-slate-600">{quote.rejectionReason}</p>
          </div>
        )}

        {quote.status === 'PENDING_APPROVAL' && quote.expiresAt && (
          <p className="mt-4 text-sm text-slate-500">
            This quote expires on {new Date(quote.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Quote Details Grid */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Customer Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Customer Information</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{quote.customer.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{quote.customer.email}</dd>
            </div>
            {quote.customer.phone && (
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{quote.customer.phone}</dd>
              </div>
            )}
            {quote.customer.company && (
              <div>
                <dt className="text-slate-500">Company</dt>
                <dd className="font-medium text-slate-900">{quote.customer.company}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Account Manager */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Account Manager</h3>
          {quote.accountManager?.name ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">{quote.accountManager.name}</dd>
              </div>
              {quote.accountManager.email && (
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900">
                    <a href={`mailto:${quote.accountManager.email}`} className="text-blue-600 hover:underline">
                      {quote.accountManager.email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">An account manager will be assigned to your quote.</p>
          )}
        </div>
      </div>

      {/* Items */}
      {quote.items.length > 0 && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Quote Items</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {quote.items.map((item) => (
              <div key={item.id} className="p-6 flex gap-4">
                {item.imageUrl && (
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{item.productName}</h4>
                  <p className="text-sm text-slate-600">
                    {item.styleNumber} | {item.colorName || item.colorCode} | {item.size}
                  </p>
                  {item.decorations && item.decorations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.decorations.map((dec, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          {dec.method} - {dec.location}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Qty: {item.quantity}</p>
                  <p className="font-semibold text-slate-900">${item.lineTotal.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Quote Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium text-slate-900">${quote.pricing.subtotal.toFixed(2)}</span>
          </div>
          {quote.pricing.decorationTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Decoration</span>
              <span className="font-medium text-slate-900">${quote.pricing.decorationTotal.toFixed(2)}</span>
            </div>
          )}
          {quote.pricing.setupFees > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Setup Fees</span>
              <span className="font-medium text-slate-900">${quote.pricing.setupFees.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Shipping</span>
            <span className="font-medium text-slate-900">${quote.pricing.shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax</span>
            <span className="font-medium text-slate-900">${quote.pricing.tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-200 pt-3 flex justify-between">
            <span className="text-lg font-semibold text-slate-900">Total</span>
            <span className="text-2xl font-bold text-emerald-600">${quote.pricing.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/search"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
        >
          Continue Shopping
        </Link>
        <Link
          href="/portal/orders"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-slate-700 font-medium hover:bg-slate-50"
        >
          View All Orders
        </Link>
      </div>
    </div>
  );
}

