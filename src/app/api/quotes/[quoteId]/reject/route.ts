/**
 * Reject Quote API
 * 
 * POST /api/quotes/[quoteId]/reject
 * Account manager rejects a quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { rejectQuote, getQuoteById } from '@/lib/quotes/service';
import { sendQuoteRejectedEmail } from '@/lib/email/quote-emails';

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
    
    // Rejection reason is required
    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }
    
    // Get the quote first
    const existingQuote = await getQuoteById(quoteId);
    
    if (!existingQuote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized to reject
    const userEmail = session.user.email as string;
    const userName = session.user.name as string;
    const isAccountManager = existingQuote.accountManagerEmail === userEmail;
    const userRoles = (session.user['https://promosink.com/roles'] as string[]) || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('staff');
    
    if (!isAccountManager && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to reject this quote' },
        { status: 403 }
      );
    }
    
    // Reject the quote
    const quote = await rejectQuote(
      quoteId,
      body.reason,
      session.user.sub as string,
      userName
    );
    
    // Send rejection email to customer
    try {
      await sendQuoteRejectedEmail({
        customerEmail: quote.customerEmail,
        customerName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        rejectionReason: body.reason,
        accountManagerName: userName,
        accountManagerEmail: quote.accountManagerEmail || undefined,
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        rejectionReason: quote.rejectionReason,
        reviewedAt: quote.reviewedAt,
      },
    });
    
  } catch (error) {
    console.error('Reject quote error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject quote' 
      },
      { status: 500 }
    );
  }
}

