'use client';

/**
 * Order Detail Page
 * 
 * Shows complete order information with:
 * - Customer details
 * - Line items
 * - Decoration specs
 * - Artwork files
 * - Status history
 * - Admin actions (update status, add notes)
 */

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

type OrderStatus = 'DRAFT' | 'QUOTED' | 'APPROVED' | 'IN_PRODUCTION' | 'SHIPPED' | 'CANCELLED';

interface OrderDetail {
  id: string;
  externalId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerCompany: string | null;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: Array<{
    id: string;
    supplierPartId: string;
    colorCode: string;
    sizeCode: string;
    quantity: number;
    decorations: Array<{
      id: string;
      method: string;
      location: string | null;
      colors: number | null;
      notes: string | null;
      artworks: Array<{
        id: string;
        type: string;
        url: string;
      }>;
    }>;
  }>;
  decorations: Array<{
    id: string;
    method: string;
    location: string | null;
    colors: number | null;
    notes: string | null;
    proofRequired: boolean;
    artworks: Array<{
      id: string;
      type: string;
      url: string;
    }>;
  }>;
  artworks: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

const STATUS_OPTIONS: OrderStatus[] = [
  'DRAFT',
  'QUOTED',
  'APPROVED',
  'IN_PRODUCTION',
  'SHIPPED',
  'CANCELLED',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  QUOTED: 'Quoted',
  APPROVED: 'Approved',
  IN_PRODUCTION: 'In Production',
  SHIPPED: 'Shipped',
  CANCELLED: 'Cancelled',
};

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('DRAFT');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [resolvedParams.orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
        setNewStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) {
      setIsEditingStatus(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updated = await response.json();
        setOrder(updated);
        setIsEditingStatus(false);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Order not found</p>
          <Link href="/portal/orders" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const totalQuantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/portal/orders"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order {order.id}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Created {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditingStatus ? (
              <>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingStatus(false);
                    setNewStatus(order.status);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {STATUS_LABELS[order.status]}
                </span>
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Update Status
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.customerName || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.customerEmail || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Company</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.customerCompany || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Line Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-4 text-sm text-gray-900">{line.supplierPartId}</td>
                      <td className="px-3 py-4 text-sm text-gray-900">{line.colorCode}</td>
                      <td className="px-3 py-4 text-sm text-gray-900">{line.sizeCode}</td>
                      <td className="px-3 py-4 text-sm text-gray-900 text-right">{line.quantity}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-3 py-3 text-sm font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 text-right">
                      {totalQuantity}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Decorations */}
          {order.decorations.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Decoration Details</h2>
              <div className="space-y-4">
                {order.decorations.map((decoration) => (
                  <div key={decoration.id} className="border border-gray-200 rounded-lg p-4">
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Method</dt>
                        <dd className="mt-1 text-sm text-gray-900">{decoration.method.toUpperCase()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-900">{decoration.location || '—'}</dd>
                      </div>
                      {decoration.colors && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Colors</dt>
                          <dd className="mt-1 text-sm text-gray-900">{decoration.colors}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Proof Required</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {decoration.proofRequired ? 'Yes' : 'No'}
                        </dd>
                      </div>
                    </dl>
                    {decoration.notes && (
                      <div className="mt-4">
                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                        <dd className="mt-1 text-sm text-gray-700">{decoration.notes}</dd>
                      </div>
                    )}
                    {decoration.artworks.length > 0 && (
                      <div className="mt-4">
                        <dt className="text-sm font-medium text-gray-500 mb-2">Artwork Files</dt>
                        <div className="space-y-1">
                          {decoration.artworks.map((artwork) => (
                            <a
                              key={artwork.id}
                              href={artwork.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-600 hover:text-blue-800 truncate"
                            >
                              {artwork.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Notes */}
          {order.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Created</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Last Updated</p>
                <p className="text-xs text-gray-500">{new Date(order.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

