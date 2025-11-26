/**
 * Quote Submission Page
 * 
 * Replaces checkout - submits cart for account manager approval
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';

export default function QuoteSubmitPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { items, summary, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');

  // Account Manager
  const [accountManagerEmail, setAccountManagerEmail] = useState('');
  const [amEmailError, setAmEmailError] = useState<string | null>(null);

  // Shipping Address
  const [shipName, setShipName] = useState('');
  const [shipCompany, setShipCompany] = useState('');
  const [shipStreet1, setShipStreet1] = useState('');
  const [shipStreet2, setShipStreet2] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipPostalCode, setShipPostalCode] = useState('');
  const [shipCountry] = useState('US');
  const [shipPhone, setShipPhone] = useState('');

  // Order Details
  const [poNumber, setPoNumber] = useState('');
  const [inHandsDate, setInHandsDate] = useState('');
  const [notes, setNotes] = useState('');

  // Populate user info when available
  useEffect(() => {
    if (user) {
      setCustomerName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || '');
      setCustomerEmail(user.emailAddresses[0]?.emailAddress || '');
    }
  }, [user]);

  // Validate account manager email domain
  const validateAmEmail = (email: string) => {
    if (!email) {
      setAmEmailError(null);
      return true;
    }
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== 'promosink.com' && domain !== 'promosinkwall-e.com') {
      setAmEmailError('Account manager email must be @promosink.com');
      return false;
    }
    setAmEmailError(null);
    return true;
  };

  // Show sign-in prompt if not logged in
  if (userLoaded && !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Sign In Required</h1>
        <p className="mt-4 text-lg text-slate-600">
          Please sign in to submit a quote request
        </p>
        <SignInButton mode="modal">
          <button className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  // Redirect if cart is empty
  if (userLoaded && items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Your Cart is Empty</h1>
          <p className="mt-4 text-lg text-slate-600">
            Add items to your cart before submitting a quote
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

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const quoteData = {
        customerInfo: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          company: customerCompany || undefined,
        },
        shippingAddress: shipStreet1 ? {
          name: shipName,
          company: shipCompany || undefined,
          street1: shipStreet1,
          street2: shipStreet2 || undefined,
          city: shipCity,
          state: shipState,
          postalCode: shipPostalCode,
          country: shipCountry,
          phone: shipPhone,
        } : undefined,
        items: items.map((item) => ({
          canonicalStyleId: item.canonicalStyleId,
          styleNumber: item.styleNumber,
          productName: item.productName,
          supplierPartId: item.supplierPartId,
          colorCode: item.color,
          colorName: item.colorName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          imageUrl: item.imageUrl,
          decorations: item.decorations?.map((dec) => ({
            method: dec.method,
            location: dec.location,
            description: dec.description,
            artworkUrl: dec.artworkUrl,
            colors: dec.colors,
            stitches: dec.stitches,
            width: dec.width,
            height: dec.height,
            setupFee: dec.setupFee,
            unitCost: dec.unitCost,
          })),
        })),
        pricing: {
          subtotal: summary.subtotal,
          decorationTotal: summary.decorationTotal,
          setupFees: summary.setupFees,
          shipping: summary.shipping,
          tax: summary.tax,
          total: summary.total,
        },
        poNumber: poNumber || undefined,
        inHandsDate: inHandsDate || undefined,
        notes: notes || undefined,
        accountManagerEmail: accountManagerEmail || undefined,
      };

      // Validate AM email if provided
      if (accountManagerEmail && !validateAmEmail(accountManagerEmail)) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/quotes/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Quote submission failed');
      }

      // Clear cart and redirect to confirmation
      clearCart();
      router.push(`/quote/${result.quote.quoteNumber}?submitted=true`);
    } catch (err) {
      console.error('Quote submission error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }
  };

  if (!userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Submit Quote for Approval</h1>
        <p className="mt-2 text-slate-600">
          Complete your information below. Your quote will be sent to your account manager for review.
        </p>
      </div>

      <form onSubmit={handleSubmitQuote} className="grid gap-8 lg:grid-cols-3">
        {/* Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Customer Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Account Manager */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Account Manager</h2>
            <p className="text-sm text-slate-600 mb-4">
              Enter your Promos Ink account manager&apos;s email address
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Manager Email
              </label>
              <input
                type="email"
                value={accountManagerEmail}
                onChange={(e) => {
                  setAccountManagerEmail(e.target.value);
                  if (e.target.value) validateAmEmail(e.target.value);
                }}
                onBlur={(e) => validateAmEmail(e.target.value)}
                className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
                  amEmailError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
                placeholder="name@promosink.com"
              />
              {amEmailError && (
                <p className="mt-1 text-sm text-red-600">{amEmailError}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Don&apos;t have an account manager yet? Leave blank and we&apos;ll assign one to your quote.
              </p>
            </div>
          </div>

          {/* Shipping Address (Optional) */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Shipping Address</h2>
            <p className="text-sm text-slate-500 mb-4">Optional - can be added later</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={shipName}
                  onChange={(e) => setShipName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={shipCompany}
                  onChange={(e) => setShipCompany(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={shipStreet1}
                  onChange={(e) => setShipStreet1(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Apt, Suite, etc.</label>
                <input
                  type="text"
                  value={shipStreet2}
                  onChange={(e) => setShipStreet2(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={shipCity}
                  onChange={(e) => setShipCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  maxLength={2}
                  value={shipState}
                  onChange={(e) => setShipState(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={shipPostalCode}
                  onChange={(e) => setShipPostalCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={shipPhone}
                  onChange={(e) => setShipPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quote Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quote Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">In-Hands Date</label>
                <input
                  type="date"
                  value={inHandsDate}
                  onChange={(e) => setInHandsDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes for Account Manager</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any special instructions or requests..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quote Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Quote Summary</h2>

            {/* Items Preview */}
            <div className="mt-4 space-y-3 border-b border-slate-200 pb-4">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.imageUrl && (
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.colorName} / {item.size} × {item.quantity}</p>
                  </div>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-sm text-slate-500">+ {items.length - 3} more items</p>
              )}
            </div>

            {/* Pricing */}
            <div className="mt-4 space-y-3">
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
                <span className="text-slate-600">Est. Shipping</span>
                <span className="font-medium text-slate-900">${summary.shipping.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Est. Tax</span>
                <span className="font-medium text-slate-900">${summary.tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-900">Estimated Total</span>
                <span className="text-2xl font-bold text-emerald-600">${summary.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Quote for Approval'
              )}
            </button>

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> This quote will be reviewed by your account manager before becoming an order. You&apos;ll receive an email confirmation once approved.
              </p>
            </div>

            <Link
              href="/cart"
              className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Back to Cart
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

