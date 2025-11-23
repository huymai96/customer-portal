/**
 * API Route Handler: Submit Order
 * POST /api/orders/submit
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  submitOrder,
  generateExternalOrderId,
  validateOrderData,
  type OrderRequest,
} from '@/lib/orders/service';
import { getApiErrorMessage } from '@/lib/api/client';

export async function POST(request: NextRequest) {
  try {
    // For now, skip Auth0 session check until we add proper middleware
    // TODO: Add proper authentication middleware
    
    // Parse request body (cart data from customer)
    const cartData = await request.json() as {
      externalOrderId?: string;
      customerInfo?: { name?: string; email?: string; phone?: string; company?: string };
      shippingAddress: any;
      items: any[];
      shipping?: { method?: string; cost?: number };
      pricing?: { subtotal?: number; decorationTotal?: number; setupFees?: number; shipping?: number; tax?: number; total?: number };
      shippingMethod?: string;
      shippingCost?: number;
      notes?: string;
      inHandsDate?: string;
      poNumber?: string;
    };

    // Build order request for API-Docs
    const orderRequest: OrderRequest = {
      partnerCode: process.env.PORTAL_PARTNER_CODE || 'PORTAL',
      externalOrderId: cartData.externalOrderId || generateExternalOrderId(),
      customerInfo: {
        name: cartData.customerInfo?.name || '',
        email: cartData.customerInfo?.email || '',
        phone: cartData.customerInfo?.phone || '',
        company: cartData.customerInfo?.company,
      },
      shippingAddress: cartData.shippingAddress,
      items: cartData.items.map((item: any) => ({
        styleNumber: item.styleNumber,
        productName: item.productName,
        supplierPartId: item.supplierPartId,
        canonicalStyleId: item.canonicalStyleId,
        color: item.color,
        colorName: item.colorName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        decorations: item.decorations || [],
      })),
      shipping: cartData.shipping || {
        method: cartData.shippingMethod || 'ground',
        cost: cartData.shippingCost || 0,
      },
      pricing: {
        subtotal: cartData.pricing?.subtotal || 0,
        decorationTotal: cartData.pricing?.decorationTotal || 0,
        setupFees: cartData.pricing?.setupFees || 0,
        shipping: cartData.pricing?.shipping || 0,
        tax: cartData.pricing?.tax || 0,
        total: cartData.pricing?.total || 0,
      },
      notes: cartData.notes,
      inHandsDate: cartData.inHandsDate,
      poNumber: cartData.poNumber,
    };

    // Validate order data
    const validationErrors = validateOrderData(orderRequest);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // Submit to API-Docs platform
    const result = await submitOrder(orderRequest);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Order submission error:', error);
    
    const errorMessage = getApiErrorMessage(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

