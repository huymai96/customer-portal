/**
 * Approve Quote via Email Token
 * 
 * GET /api/quotes/approve-token/[token]
 * Returns quote details for the approval page
 * 
 * POST /api/quotes/approve-token/[token]
 * Approves or rejects the quote via token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuoteByApprovalToken, approveQuote, rejectQuote, convertQuoteToOrder } from '@/lib/quotes/service';
import { sendQuoteApprovedEmail, sendQuoteRejectedEmail, sendOrderAcknowledgmentEmail } from '@/lib/email/quote-emails';
import { apiRequest } from '@/lib/api/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { error, quote } = await getQuoteByApprovalToken(token);
    
    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: error === 'Invalid token' ? 404 : 400 }
      );
    }
    
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
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
        submittedAt: quote.submittedAt,
        expiresAt: quote.expiresAt,
      },
    });
    
  } catch (error) {
    console.error('Get quote by token error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    const { error, quote } = await getQuoteByApprovalToken(token);
    
    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: error === 'Invalid token' ? 404 : 400 }
      );
    }
    
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    const action = body.action; // 'approve' or 'reject'
    const accountManagerName = body.accountManagerName || 'Account Manager';
    
    if (action === 'approve') {
      // Approve the quote
      const approvedQuote = await approveQuote(
        quote.id,
        undefined, // No user ID from email approval
        accountManagerName,
        body.internalNotes
      );
      
      // Convert to order and submit to Promos Ink API
      let orderResult = null;
      try {
        const orderData = await convertQuoteToOrder(quote.id);
        orderResult = await apiRequest({
          method: 'POST',
          path: '/api/orders',
          body: orderData,
        });
      } catch (apiError) {
        console.error('Failed to submit order to Promos Ink API:', apiError);
      }
      
      // Send emails
      try {
        await sendQuoteApprovedEmail({
          customerEmail: approvedQuote.customerEmail,
          customerName: approvedQuote.customerName,
          quoteNumber: approvedQuote.quoteNumber,
          total: Number(approvedQuote.total),
          approvedBy: accountManagerName,
        });
        
        await sendOrderAcknowledgmentEmail({
          customerEmail: approvedQuote.customerEmail,
          customerName: approvedQuote.customerName,
          quoteNumber: approvedQuote.quoteNumber,
          total: Number(approvedQuote.total),
          items: approvedQuote.items,
          accountManagerEmail: approvedQuote.accountManagerEmail || undefined,
          accountManagerName,
        });
      } catch (emailError) {
        console.error('Failed to send approval emails:', emailError);
      }
      
      return NextResponse.json({
        success: true,
        action: 'approved',
        quote: {
          id: approvedQuote.id,
          quoteNumber: approvedQuote.quoteNumber,
          status: approvedQuote.status,
        },
        order: orderResult,
      });
      
    } else if (action === 'reject') {
      if (!body.reason) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      
      const rejectedQuote = await rejectQuote(
        quote.id,
        body.reason,
        undefined,
        accountManagerName
      );
      
      // Send rejection email
      try {
        await sendQuoteRejectedEmail({
          customerEmail: rejectedQuote.customerEmail,
          customerName: rejectedQuote.customerName,
          quoteNumber: rejectedQuote.quoteNumber,
          rejectionReason: body.reason,
          accountManagerName,
          accountManagerEmail: rejectedQuote.accountManagerEmail || undefined,
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
      
      return NextResponse.json({
        success: true,
        action: 'rejected',
        quote: {
          id: rejectedQuote.id,
          quoteNumber: rejectedQuote.quoteNumber,
          status: rejectedQuote.status,
        },
      });
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Quote action error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process quote action' 
      },
      { status: 500 }
    );
  }
}

