/**
 * Quote Submission API
 * 
 * POST /api/quotes/submit
 * Creates a new quote from cart data and sends for approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { createQuote, type CreateQuoteInput } from '@/lib/quotes/service';
import { sendQuoteSubmittedEmail, sendQuoteApprovalRequestEmail } from '@/lib/email/quote-emails';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.customerInfo?.name || !body.customerInfo?.email) {
      return NextResponse.json(
        { success: false, error: 'Customer name and email are required' },
        { status: 400 }
      );
    }
    
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      );
    }
    
    // Create quote input
    const quoteInput: CreateQuoteInput = {
      customerInfo: {
        name: body.customerInfo.name,
        email: body.customerInfo.email,
        phone: body.customerInfo.phone,
        company: body.customerInfo.company,
      },
      shippingAddress: body.shippingAddress,
      items: body.items.map((item: {
        canonicalStyleId: string;
        styleNumber: string;
        productName: string;
        supplierPartId: string;
        colorCode?: string;
        color?: string;
        colorName?: string;
        size: string;
        quantity: number;
        unitPrice: number;
        imageUrl?: string;
        decorations?: Array<{
          method: string;
          location: string;
          description?: string;
          artworkUrl?: string;
          colors?: number;
          stitches?: number;
          width?: number;
          height?: number;
          setupFee: number;
          unitCost: number;
        }>;
      }) => ({
        canonicalStyleId: item.canonicalStyleId,
        styleNumber: item.styleNumber,
        productName: item.productName,
        supplierPartId: item.supplierPartId,
        colorCode: item.colorCode || item.color || '',
        colorName: item.colorName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: item.imageUrl,
        decorations: item.decorations,
      })),
      pricing: {
        subtotal: body.pricing?.subtotal || 0,
        decorationTotal: body.pricing?.decorationTotal || 0,
        setupFees: body.pricing?.setupFees || 0,
        shipping: body.pricing?.shipping || 0,
        tax: body.pricing?.tax || 0,
        total: body.pricing?.total || 0,
      },
      poNumber: body.poNumber,
      inHandsDate: body.inHandsDate,
      notes: body.notes,
      accountManagerEmail: body.accountManagerEmail,
    };
    
    // Create the quote
    const quote = await createQuote(quoteInput);
    
    // Send email notifications (non-blocking)
    try {
      // Email to customer confirming quote submission
      await sendQuoteSubmittedEmail({
        customerEmail: quoteInput.customerInfo.email,
        customerName: quoteInput.customerInfo.name,
        quoteNumber: quote.quoteNumber,
        total: quote.total,
      });
      
      // Email to account manager for approval
      if (quoteInput.accountManagerEmail) {
        await sendQuoteApprovalRequestEmail({
          accountManagerEmail: quoteInput.accountManagerEmail,
          customerName: quoteInput.customerInfo.name,
          quoteNumber: quote.quoteNumber,
          total: quote.total,
          quoteId: quote.id,
        });
      }
    } catch (emailError) {
      console.error('Failed to send quote emails:', emailError);
      // Don't fail the request if emails fail
    }
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        total: quote.total,
        submittedAt: quote.submittedAt,
      },
    });
    
  } catch (error) {
    console.error('Quote submission error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit quote' 
      },
      { status: 500 }
    );
  }
}

