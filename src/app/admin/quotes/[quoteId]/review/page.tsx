/**
 * Account Manager - Quote Review Page
 * 
 * Full quote details with approve/reject actions
 */

'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
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
    colors?: number;
    stitches?: number;
    unitCost: number;
    setupFee: number;
  }>;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  shippingAddress?: {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  poNumber?: string;
  inHandsDate?: string;
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
  submittedAt: string;
  expiresAt?: string;
}

export default function QuoteReviewPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/quotes/${resolvedParams.quoteId}`);
        const data = await response.json();
        
        if (data.success) {
          setQuote(data.quote);
        } else {
          setError(data.error || 'Failed to load quote');
        }
      } catch (err) {
        console.error('Failed to fetch quote:', err);
        setError('Failed to load quote');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchQuote();
    }
  }, [user, resolvedParams.quoteId]);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this quote? This will convert it to an order.')) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${resolvedParams.quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/quotes/pending?approved=true');
      } else {
        setError(data.error || 'Failed to approve quote');
      }
    } catch (err) {
      console.error('Failed to approve quote:', err);
      setError('Failed to approve quote');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${resolvedParams.quoteId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/quotes/pending?rejected=true');
      } else {
        setError(data.error || 'Failed to reject quote');
      }
    } catch (err) {
      console.error('Failed to reject quote:', err);
      setError('Failed to reject quote');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  if (!userLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <SignInButton mode="modal">
          <button className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Quote Not Found</h1>
        <p className="mt-4 text-slate-600">{error}</p>
        <Link href="/admin/quotes/pending" className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white">
          Back to Pending Quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/quotes/pending" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Pending Quotes
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Review Quote {quote.quoteNumber}</h1>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-800">
          ⏳ Pending Approval
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{quote.customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{quote.customer.email}</p>
              </div>
              {quote.customer.phone && (
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{quote.customer.phone}</p>
                </div>
              )}
              {quote.customer.company && (
                <div>
                  <p className="text-sm text-slate-500">Company</p>
                  <p className="font-medium text-slate-900">{quote.customer.company}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          {quote.shippingAddress && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipping Address</h2>
              <address className="not-italic text-slate-700">
                {quote.shippingAddress.name}<br />
                {quote.shippingAddress.company && <>{quote.shippingAddress.company}<br /></>}
                {quote.shippingAddress.street1}<br />
                {quote.shippingAddress.street2 && <>{quote.shippingAddress.street2}<br /></>}
                {quote.shippingAddress.city}, {quote.shippingAddress.state} {quote.shippingAddress.postalCode}<br />
                {quote.shippingAddress.country}
              </address>
            </div>
          )}

          {/* Items */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Quote Items</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {quote.items.map((item) => (
                <div key={item.id} className="p-6">
                  <div className="flex gap-4">
                    {item.imageUrl && (
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{item.productName}</h4>
                      <p className="text-sm text-slate-600">
                        Style: {item.styleNumber} | Color: {item.colorName || item.colorCode} | Size: {item.size}
                      </p>
                      
                      {item.decorations && item.decorations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.decorations.map((dec, idx) => (
                            <div key={idx} className="text-sm text-slate-600 bg-blue-50 rounded px-2 py-1 inline-block mr-2">
                              <span className="font-medium">{dec.method}</span> @ {dec.location}
                              {dec.description && <span className="text-slate-500"> - {dec.description}</span>}
                              <span className="ml-2 text-blue-700">${dec.unitCost.toFixed(2)}/ea</span>
                              {dec.setupFee > 0 && <span className="text-blue-600"> + ${dec.setupFee.toFixed(2)} setup</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      <p className="text-sm text-slate-500">${item.unitPrice.toFixed(2)} each</p>
                      <p className="text-lg font-semibold text-slate-900">${item.lineTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Notes */}
          {quote.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Notes</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Internal Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Internal Notes (Optional)</h2>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add notes for your records (not visible to customer)..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {/* Quote Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quote Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">${quote.pricing.subtotal.toFixed(2)}</span>
                </div>
                {quote.pricing.decorationTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Decoration</span>
                    <span className="font-medium">${quote.pricing.decorationTotal.toFixed(2)}</span>
                  </div>
                )}
                {quote.pricing.setupFees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Setup Fees</span>
                    <span className="font-medium">${quote.pricing.setupFees.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Shipping</span>
                  <span className="font-medium">${quote.pricing.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tax</span>
                  <span className="font-medium">${quote.pricing.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">${quote.pricing.total.toFixed(2)}</span>
                </div>
              </div>

              {quote.poNumber && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500">PO Number</p>
                  <p className="font-medium text-slate-900">{quote.poNumber}</p>
                </div>
              )}

              {quote.inHandsDate && (
                <div className="mt-2">
                  <p className="text-sm text-slate-500">In-Hands Date</p>
                  <p className="font-medium text-slate-900">{new Date(quote.inHandsDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
              
              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? 'Processing...' : '✓ Approve Quote'}
                </button>
                
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 disabled:cursor-not-allowed transition-colors"
                >
                  ✗ Reject Quote
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500 text-center">
                Approving will convert this quote to an order and notify the customer.
              </p>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <div>
                    <p className="font-medium text-slate-900">Quote Submitted</p>
                    <p className="text-slate-500">{new Date(quote.submittedAt).toLocaleString()}</p>
                  </div>
                </div>
                {quote.expiresAt && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                    <div>
                      <p className="font-medium text-slate-900">Expires</p>
                      <p className="text-slate-500">{new Date(quote.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Reject Quote</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejection. This will be sent to the customer.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Reason for rejection..."
              autoFocus
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {processing ? 'Rejecting...' : 'Reject Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

