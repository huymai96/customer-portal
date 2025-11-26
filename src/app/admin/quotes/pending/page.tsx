/**
 * Account Manager - Pending Quotes Page
 * 
 * Shows all quotes pending approval for the account manager
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

interface QuotePreview {
  id: string;
  quoteNumber: string;
  status: string;
  customer: {
    name: string;
    email: string;
    company?: string;
  };
  itemCount: number;
  totalQuantity: number;
  total: number;
  submittedAt: string;
  expiresAt?: string;
  itemPreview: Array<{
    productName: string;
    styleNumber: string;
    quantity: number;
    imageUrl?: string;
  }>;
}

export default function PendingQuotesPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [quotes, setQuotes] = useState<QuotePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPendingQuotes() {
      try {
        const response = await fetch('/api/quotes/pending');
        const data = await response.json();
        
        if (data.success) {
          setQuotes(data.quotes);
        } else {
          setError(data.error || 'Failed to load quotes');
        }
      } catch (err) {
        console.error('Failed to fetch pending quotes:', err);
        setError('Failed to load quotes');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchPendingQuotes();
    }
  }, [user]);

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
        <p className="mt-4 text-slate-600">Please log in to access this page.</p>
        <SignInButton mode="modal">
          <button className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pending Quote Approvals</h1>
        <p className="mt-2 text-slate-600">
          Review and approve customer quotes
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-800">Pending Approval</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{quotes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-600">Total Value</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            ${quotes.reduce((sum, q) => sum + q.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-600">Total Items</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {quotes.reduce((sum, q) => sum + q.totalQuantity, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-4">
            ✓
          </div>
          <h2 className="text-xl font-semibold text-slate-900">All Caught Up!</h2>
          <p className="mt-2 text-slate-600">No quotes pending approval at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Quote Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{quote.quoteNumber}</h3>
                    <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      ⏳ Pending
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                    <span>
                      <strong className="text-slate-900">{quote.customer.name}</strong>
                      {quote.customer.company && ` · ${quote.customer.company}`}
                    </span>
                    <span>{quote.customer.email}</span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quote.itemPreview.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                        {item.imageUrl && (
                          <div className="h-6 w-6 overflow-hidden rounded">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <span className="text-xs text-slate-700">{item.productName} ×{item.quantity}</span>
                      </div>
                    ))}
                    {quote.itemCount > 3 && (
                      <span className="text-xs text-slate-500 self-center">+{quote.itemCount - 3} more</span>
                    )}
                  </div>
                </div>

                {/* Quote Value & Actions */}
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{quote.totalQuantity} items</p>
                    <p className="text-2xl font-bold text-slate-900">${quote.total.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/quotes/${quote.id}/review`}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Review & Approve
                    </Link>
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(quote.submittedAt).toLocaleDateString()}
                    {quote.expiresAt && ` · Expires ${new Date(quote.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

