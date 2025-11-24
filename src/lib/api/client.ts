/**
 * API Client for communicating with Promos Ink API-Docs platform
 * Handles authentication, HMAC signing, and request/response formatting
 */

import { generateHmacSignature } from './hmac';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://promosinkwall-e.com';
const API_KEY = process.env.PORTAL_API_KEY || '';
const API_SECRET = process.env.PORTAL_API_SECRET || '';
const CUSTOMER_ID = process.env.PORTAL_CUSTOMER_ID || '';
const PARTNER_CODE = process.env.PORTAL_PARTNER_CODE || 'PORTAL';

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown> | unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  options: ApiRequestOptions
): Promise<T> {
  const { method, path, body, headers = {}, timeout = 30000 } = options;
  
  // Validate required credentials
  if (!API_KEY || !API_SECRET || !CUSTOMER_ID) {
    throw new ApiError(
      'Missing API credentials. Check environment variables.',
      'MISSING_CREDENTIALS'
    );
  }
  
  const timestamp = Date.now();
  const bodyString = body ? JSON.stringify(body) : '';
  
  // Generate HMAC signature
  const signature = generateHmacSignature(
    timestamp,
    method,
    path,
    bodyString,
    API_SECRET
  );
  
  // Prepare request
  const url = `${API_BASE_URL}${path}`;
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature,
    'X-Customer-ID': CUSTOMER_ID,
    'X-Partner-Code': PARTNER_CODE,
    ...headers,
  };
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: bodyString || undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Parse response
    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new ApiError(
        'Invalid JSON response from API',
        'INVALID_RESPONSE',
        response.status
      );
    }
    
    if (!response.ok) {
      const errorData = responseData as { error?: string; code?: string };
      throw new ApiError(
        errorData.error || `API request failed with status ${response.status}`,
        errorData.code || 'API_ERROR',
        response.status
      );
    }
    
    return responseData as T;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(
          'Request timeout - please try again',
          'TIMEOUT'
        );
      }
      
      throw new ApiError(
        error.message || 'Network error',
        'NETWORK_ERROR'
      );
    }
    
    throw new ApiError('Unknown error occurred', 'UNKNOWN_ERROR');
  }
}

/**
 * Helper to handle API errors in a user-friendly way
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
      case 'INVALID_SIGNATURE':
        return 'Authentication failed. Please contact support.';
      case 'MISSING_CUSTOMER_ID':
        return 'Invalid customer configuration. Please contact support.';
      case 'PRODUCT_NOT_FOUND':
        return 'One or more products are no longer available.';
      case 'INSUFFICIENT_INVENTORY':
        return 'Some items are out of stock. Please adjust quantities.';
      case 'DUPLICATE_ORDER':
        return 'This order has already been submitted.';
      case 'INVALID_ADDRESS':
        return 'Shipping address is invalid. Please check and try again.';
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

