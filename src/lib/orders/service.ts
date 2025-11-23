/**
 * Type definitions and service functions for order submission
 */

import { apiRequest } from '../api/client';
import { DecorationMethod, DecorationLocation } from '../decoration/pricing';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface OrderDecoration {
  method: DecorationMethod;
  location: DecorationLocation;
  description: string;
  artworkUrl?: string;
  colors?: number;
  stitches?: number;
  width?: number;  // inches
  height?: number; // inches
  setupFee: number;
  unitCost: number;
}

export interface OrderItem {
  styleNumber: string;
  productName: string;
  supplierPartId: string;
  canonicalStyleId: string;
  color: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  decorations?: OrderDecoration[];
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface ShippingInfo {
  method: string;
  cost: number;
  carrier?: string;
  requestedDate?: string;
}

export interface OrderPricing {
  subtotal: number;
  decorationTotal: number;
  setupFees: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface OrderRequest {
  partnerCode: string;
  externalOrderId: string;
  customerInfo: CustomerInfo;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  shipping?: ShippingInfo;
  pricing: OrderPricing;
  notes?: string;
  inHandsDate?: string;
  poNumber?: string;
}

export interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    externalOrderId: string;
    createdAt: string;
    items: any[];
    total: number;
    trackingNumber?: string;
  };
}

export interface OrderStatusResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: 'RECEIVED' | 'PROCESSING' | 'PRODUCTION' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    externalOrderId: string;
    createdAt: string;
    updatedAt: string;
    items: any[];
    total: number;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    notes?: string;
  };
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Submit an order to the Promos Ink API
 */
export async function submitOrder(
  orderData: OrderRequest
): Promise<OrderResponse> {
  return apiRequest<OrderResponse>({
    method: 'POST',
    path: '/api/orders',
    body: orderData,
  });
}

/**
 * Get order status by order ID
 */
export async function getOrderStatus(
  orderId: string
): Promise<OrderStatusResponse> {
  return apiRequest<OrderStatusResponse>({
    method: 'GET',
    path: `/api/orders/${orderId}`,
  });
}

/**
 * Get order by external order ID
 */
export async function getOrderByExternalId(
  externalOrderId: string
): Promise<OrderStatusResponse> {
  return apiRequest<OrderStatusResponse>({
    method: 'GET',
    path: `/api/orders/external/${externalOrderId}`,
  });
}

/**
 * Get all orders for the customer
 */
export interface OrderListResponse {
  success: boolean;
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    total: number;
    itemCount: number;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export async function getOrders(
  page: number = 1,
  pageSize: number = 20
): Promise<OrderListResponse> {
  return apiRequest<OrderListResponse>({
    method: 'GET',
    path: `/api/orders?page=${page}&pageSize=${pageSize}`,
  });
}

/**
 * Cancel an order (if status allows)
 */
export interface CancelOrderResponse {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<CancelOrderResponse> {
  return apiRequest<CancelOrderResponse>({
    method: 'POST',
    path: `/api/orders/${orderId}/cancel`,
    body: { reason },
  });
}

/**
 * Generate a unique external order ID
 */
export function generateExternalOrderId(prefix: string = 'PORTAL'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validate order data before submission
 */
export interface OrderValidationError {
  field: string;
  message: string;
}

export function validateOrderData(
  orderData: Partial<OrderRequest>
): OrderValidationError[] {
  const errors: OrderValidationError[] = [];

  // Validate customer info
  if (!orderData.customerInfo?.name) {
    errors.push({ field: 'customerInfo.name', message: 'Customer name is required' });
  }
  if (!orderData.customerInfo?.email) {
    errors.push({ field: 'customerInfo.email', message: 'Customer email is required' });
  }
  if (!orderData.customerInfo?.phone) {
    errors.push({ field: 'customerInfo.phone', message: 'Customer phone is required' });
  }

  // Validate shipping address
  if (!orderData.shippingAddress?.name) {
    errors.push({ field: 'shippingAddress.name', message: 'Shipping name is required' });
  }
  if (!orderData.shippingAddress?.street1) {
    errors.push({ field: 'shippingAddress.street1', message: 'Street address is required' });
  }
  if (!orderData.shippingAddress?.city) {
    errors.push({ field: 'shippingAddress.city', message: 'City is required' });
  }
  if (!orderData.shippingAddress?.state) {
    errors.push({ field: 'shippingAddress.state', message: 'State is required' });
  }
  if (!orderData.shippingAddress?.postalCode) {
    errors.push({ field: 'shippingAddress.postalCode', message: 'Postal code is required' });
  }

  // Validate items
  if (!orderData.items || orderData.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one item is required' });
  } else {
    orderData.items.forEach((item, index) => {
      if (!item.styleNumber) {
        errors.push({ field: `items[${index}].styleNumber`, message: 'Style number is required' });
      }
      if (!item.color) {
        errors.push({ field: `items[${index}].color`, message: 'Color is required' });
      }
      if (!item.size) {
        errors.push({ field: `items[${index}].size`, message: 'Size is required' });
      }
      if (item.quantity <= 0) {
        errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than 0' });
      }
    });
  }

  // Validate pricing
  if (!orderData.pricing?.total || orderData.pricing.total <= 0) {
    errors.push({ field: 'pricing.total', message: 'Invalid order total' });
  }

  return errors;
}

/**
 * Format order data for display
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'RECEIVED': 'Order Received',
    'PROCESSING': 'Processing',
    'PRODUCTION': 'In Production',
    'SHIPPED': 'Shipped',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
  };
  
  return statusMap[status] || status;
}

export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'RECEIVED': 'blue',
    'PROCESSING': 'yellow',
    'PRODUCTION': 'purple',
    'SHIPPED': 'green',
    'DELIVERED': 'green',
    'CANCELLED': 'red',
  };
  
  return colorMap[status] || 'gray';
}

