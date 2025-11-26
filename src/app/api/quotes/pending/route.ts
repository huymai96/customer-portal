/**
 * Get Pending Quotes API
 * 
 * GET /api/quotes/pending
 * Returns quotes pending approval for account managers
 */

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPendingQuotes } from '@/lib/quotes/service';
import { isAdminUser } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || '';
    const isAdmin = await isAdminUser();
    
    // If admin, get all pending quotes; otherwise, only assigned ones
    const quotes = await getPendingQuotes(isAdmin ? undefined : userEmail);
    
    return NextResponse.json({
      success: true,
      quotes: quotes.map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        
        customer: {
          name: quote.customerName,
          email: quote.customerEmail,
          company: quote.customerCompany,
        },
        
        itemCount: quote.items.length,
        totalQuantity: quote.items.reduce((sum, item) => sum + item.quantity, 0),
        total: Number(quote.total),
        
        submittedAt: quote.submittedAt,
        expiresAt: quote.expiresAt,
        
        // Include first few items for preview
        itemPreview: quote.items.slice(0, 3).map((item) => ({
          productName: item.productName,
          styleNumber: item.styleNumber,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
      })),
    });
    
  } catch (error) {
    console.error('Get pending quotes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get pending quotes' },
      { status: 500 }
    );
  }
}

