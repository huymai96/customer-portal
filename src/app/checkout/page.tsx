/**
 * Checkout Page
 * 
 * Handles order submission with:
 * - Shipping address form
 * - Customer information
 * - Order review
 * - Order submission to Promos Ink API
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useCart } from '@/contexts/CartContext';
import { type OrderRequest } from '@/lib/orders/service';
import { type DecorationLocation } from '@/lib/decoration/pricing';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { items, summary, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer Info
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');

  // Shipping Address
  const [shipName, setShipName] = useState('');
  const [shipCompany, setShipCompany] = useState('');
  const [shipStreet1, setShipStreet1] = useState('');
  const [shipStreet2, setShipStreet2] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipPostalCode, setShipPostalCode] = useState('');
  const [shipCountry] = useState('US'); // Fixed: not allowing country change for now
  const [shipPhone, setShipPhone] = useState('');

  // Order Details
  const [poNumber, setPoNumber] = useState('');
  const [inHandsDate, setInHandsDate] = useState('');
  const [notes, setNotes] = useState('');

  // Redirect if not logged in
  if (!userLoading && !user) {
    router.push('/api/auth/login');
    return null;
  }

  // Redirect if cart is empty
  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build order data
      const orderData: OrderRequest = {
        partnerCode: 'PORTAL',
        externalOrderId: `PORTAL-${Date.now()}`,
        customerInfo: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          company: customerCompany || undefined,
        },
        shippingAddress: {
          name: shipName,
          company: shipCompany || undefined,
          street1: shipStreet1,
          street2: shipStreet2 || undefined,
          city: shipCity,
          state: shipState,
          postalCode: shipPostalCode,
          country: shipCountry,
          phone: shipPhone,
        },
        items: items.map((item) => ({
          styleNumber: item.styleNumber,
          productName: item.productName,
          supplierPartId: item.supplierPartId,
          canonicalStyleId: item.canonicalStyleId,
          color: item.color,
          colorName: item.colorName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          decorations: item.decorations?.map((dec) => ({
            method: dec.method,
            location: dec.location as DecorationLocation,
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
        shipping: {
          method: 'ground',
          cost: summary.shipping,
        },
        pricing: {
          subtotal: summary.subtotal,
          decorationTotal: summary.decorationTotal,
          setupFees: summary.setupFees,
          shipping: summary.shipping,
          tax: summary.tax,
          total: summary.total,
        },
        notes: notes || undefined,
        inHandsDate: inHandsDate || undefined,
        poNumber: poNumber || undefined,
      };

      // Submit order
      const response = await fetch('/api/orders/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Order submission failed');
      }

      // Clear cart and redirect to confirmation
      clearCart();
      router.push(`/orders/${result.order.id}?success=true`);
    } catch (err) {
      console.error('Order submission error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>

      <form onSubmit={handleSubmitOrder} className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Customer Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipping Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={shipName}
                  onChange={(e) => setShipName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={shipCompany}
                  onChange={(e) => setShipCompany(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={shipStreet1}
                  onChange={(e) => setShipStreet1(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Apartment, Suite, etc.</label>
                <input
                  type="text"
                  value={shipStreet2}
                  onChange={(e) => setShipStreet2(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={shipCity}
                  onChange={(e) => setShipCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={shipState}
                  onChange={(e) => setShipState(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code *</label>
                <input
                  type="text"
                  required
                  value={shipPostalCode}
                  onChange={(e) => setShipPostalCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={shipPhone}
                  onChange={(e) => setShipPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">In-Hands Date</label>
                <input
                  type="date"
                  value={inHandsDate}
                  onChange={(e) => setInHandsDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Order Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special instructions..."
                />
              </div>
            </div>
          </div>
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

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

