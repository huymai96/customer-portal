/**
 * Get Quote Details API
 * 
 * GET /api/quotes/[quoteId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getQuoteById } from '@/lib/quotes/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
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
    const userEmail = session.user.email as string;
    const isCustomer = quote.customerEmail === userEmail;
    const isAccountManager = quote.accountManagerEmail === userEmail;
    
    // For now, allow access if user is customer or account manager
    // In production, add proper role-based access control
    if (!isCustomer && !isAccountManager) {
      // Allow staff/admin access (check role from Auth0)
      const userRoles = (session.user['https://promosink.com/roles'] as string[]) || [];
      if (!userRoles.includes('admin') && !userRoles.includes('staff')) {
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
        internalNotes: isAccountManager ? quote.internalNotes : undefined,
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

