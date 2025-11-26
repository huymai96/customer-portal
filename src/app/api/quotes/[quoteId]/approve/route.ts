/**
 * Approve Quote API
 * 
 * POST /api/quotes/[quoteId]/approve
 * Account manager approves a quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { approveQuote, getQuoteById, convertQuoteToOrder } from '@/lib/quotes/service';
import { sendQuoteApprovedEmail, sendOrderAcknowledgmentEmail } from '@/lib/email/quote-emails';
import { apiRequest } from '@/lib/api/client';

export async function POST(
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
    const body = await request.json();
    
    // Get the quote first
    const existingQuote = await getQuoteById(quoteId);
    
    if (!existingQuote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to approve
    const userEmail = session.user.email as string;
    const userName = session.user.name as string;
    const isAccountManager = existingQuote.accountManagerEmail === userEmail;
    const userRoles = (session.user['https://promosink.com/roles'] as string[]) || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('staff');
    
    if (!isAccountManager && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to approve this quote' },
        { status: 403 }
      );
    }
    
    // Approve the quote
    const quote = await approveQuote(
      quoteId,
      session.user.sub as string,
      userName,
      body.internalNotes
    );
    
    // Convert to order and submit to Promos Ink API
    let orderResult = null;
    try {
      const orderData = await convertQuoteToOrder(quoteId);
      
      // Submit to Promos Ink API
      orderResult = await apiRequest({
        method: 'POST',
        path: '/api/orders',
        body: orderData,
      });
    } catch (apiError) {
      console.error('Failed to submit order to Promos Ink API:', apiError);
      // Log but don't fail - order can be retried
    }
    
    // Send email notifications
    try {
      // Email to customer - Quote approved
      await sendQuoteApprovedEmail({
        customerEmail: quote.customerEmail,
        customerName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        total: Number(quote.total),
        approvedBy: userName,
      });
      
      // Order Acknowledgment email to customer (CC account manager)
      await sendOrderAcknowledgmentEmail({
        customerEmail: quote.customerEmail,
        customerName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        total: Number(quote.total),
        items: quote.items,
        accountManagerEmail: quote.accountManagerEmail || undefined,
        accountManagerName: userName,
      });
    } catch (emailError) {
      console.error('Failed to send approval emails:', emailError);
    }
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        approvedAt: quote.approvedAt,
      },
      order: orderResult,
    });
    
  } catch (error) {
    console.error('Approve quote error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to approve quote' 
      },
      { status: 500 }
    );
  }
}

