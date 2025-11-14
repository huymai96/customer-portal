'use client';

/**
 * Order Confirmation Component
 * 
 * Displays success message after order submission with:
 * - Order ID
 * - Next steps
 * - Contact information
 * - Actions (view order, create new)
 */

import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface OrderConfirmationProps {
  orderId: string;
  customerEmail?: string;
  onCreateNew: () => void;
}

export function OrderConfirmation({ orderId, customerEmail, onCreateNew }: OrderConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircleIcon className="h-16 w-16 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Submitted Successfully!
        </h1>
        <p className="text-lg text-gray-600">
          Your order has been received and is being reviewed by our team.
        </p>
      </div>

      {/* Order Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Order ID:</span>
            <span className="font-mono font-medium text-gray-900">{orderId}</span>
          </div>
          {customerEmail && (
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmation Email:</span>
              <span className="font-medium text-gray-900">{customerEmail}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pending Review
            </span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">What Happens Next?</h2>
        <ol className="space-y-3 text-sm text-blue-800">
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-semibold">1.</span>
            <span>Our team will review your order and decoration specifications within 1 business day.</span>
          </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-semibold">2.</span>
              <span>If artwork proofs are required, we&apos;ll send them to your email for approval.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-semibold">3.</span>
              <span>Once approved, your order will move to production.</span>
            </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-semibold">4.</span>
            <span>You&apos;ll receive tracking information when your order ships.</span>
          </li>
        </ol>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h2>
        <p className="text-sm text-gray-600 mb-4">
          Our team is here to assist you with any questions about your order.
        </p>
        <div className="space-y-2">
          <a
            href="mailto:orders@promosink.com"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <EnvelopeIcon className="h-5 w-5" />
            orders@promosink.com
          </a>
          <a
            href="tel:+19724787298"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <PhoneIcon className="h-5 w-5" />
            (972) 478-7298
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCreateNew}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          Create New Order
        </button>
        <Link
          href="/portal/orders"
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-center"
        >
          View All Orders
        </Link>
      </div>
    </div>
  );
}

