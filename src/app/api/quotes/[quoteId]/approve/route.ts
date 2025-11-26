/**
 * Approve Quote API
 * 
 * POST /api/quotes/[quoteId]/approve
 * Account manager approves a quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { approveQuote, getQuoteById, convertQuoteToOrder } from '@/lib/quotes/service';
import { sendQuoteApprovedEmail, sendOrderAcknowledgmentEmail } from '@/lib/email/quote-emails';
import { apiRequest } from '@/lib/api/client';
import { isStaffUser } from '@/lib/auth';

export async function POST(
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
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || '';
    const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || userEmail;
    const isAccountManager = existingQuote.accountManagerEmail === userEmail;
    const isStaff = await isStaffUser();
    
    if (!isAccountManager && !isStaff) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to approve this quote' },
        { status: 403 }
      );
    }
    
    // Approve the quote
    const quote = await approveQuote(
      quoteId,
      userId,
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

