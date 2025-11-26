/**
 * Get Quote Details API
 * 
 * GET /api/quotes/[quoteId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getQuoteById } from '@/lib/quotes/service';
import { isStaffUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { quoteId } = await params;
    const quote = await getQuoteById(quoteId);
    
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to this quote
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || '';
    const isCustomer = quote.customerEmail === userEmail;
    const isAccountManager = quote.accountManagerEmail === userEmail;
    
    // Allow access if user is customer, account manager, or staff
    if (!isCustomer && !isAccountManager) {
      const isStaff = await isStaffUser();
      if (!isStaff) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        
        customer: {
          name: quote.customerName,
          email: quote.customerEmail,
          phone: quote.customerPhone,
          company: quote.customerCompany,
        },
        
        accountManager: {
          name: quote.accountManagerName,
          email: quote.accountManagerEmail,
        },
        
        shippingAddress: quote.shippingAddress,
        poNumber: quote.poNumber,
        inHandsDate: quote.inHandsDate,
        
        items: quote.items.map((item) => ({
          id: item.id,
          styleNumber: item.styleNumber,
          productName: item.productName,
          colorCode: item.colorCode,
          colorName: item.colorName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          decorations: item.decorations,
          imageUrl: item.imageUrl,
        })),
        
        pricing: {
          subtotal: Number(quote.subtotal),
          decorationTotal: Number(quote.decorationTotal),
          setupFees: Number(quote.setupFees),
          shipping: Number(quote.shipping),
          tax: Number(quote.tax),
          total: Number(quote.total),
        },
        
        notes: quote.notes,
        internalNotes: (isAccountManager || await isStaffUser()) ? quote.internalNotes : undefined,
        rejectionReason: quote.rejectionReason,
        
        submittedAt: quote.submittedAt,
        reviewedAt: quote.reviewedAt,
        approvedAt: quote.approvedAt,
        expiresAt: quote.expiresAt,
      },
    });
    
  } catch (error) {
    console.error('Get quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}

