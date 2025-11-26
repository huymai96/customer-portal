/**
 * Quote Service
 * 
 * Handles quote creation, submission for approval, and conversion to orders
 */

import { prisma } from '@/lib/prisma';
import { QuoteStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

// Types
export interface QuoteCustomerInfo {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface QuoteShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface QuoteItemDecoration {
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
}

export interface QuoteItemInput {
  canonicalStyleId: string;
  styleNumber: string;
  productName: string;
  supplierPartId: string;
  colorCode: string;
  colorName?: string;
  size: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  decorations?: QuoteItemDecoration[];
}

export interface CreateQuoteInput {
  customerInfo: QuoteCustomerInfo;
  shippingAddress?: QuoteShippingAddress;
  items: QuoteItemInput[];
  pricing: {
    subtotal: number;
    decorationTotal: number;
    setupFees: number;
    shipping: number;
    tax: number;
    total: number;
  };
  poNumber?: string;
  inHandsDate?: string;
  notes?: string;
  accountManagerEmail?: string;
}

export interface QuoteResult {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  total: number;
  submittedAt: Date;
}

/**
 * Generate a unique quote number
 */
function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `QT-${year}-${random}`;
}

/**
 * Generate a secure approval token
 */
function generateApprovalToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new quote from cart data
 */
export async function createQuote(input: CreateQuoteInput): Promise<QuoteResult> {
  const quoteNumber = generateQuoteNumber();
  const approvalToken = generateApprovalToken();
  
  // Token expires in 7 days
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);
  
  // Quote expires in 30 days
  const quoteExpiresAt = new Date();
  quoteExpiresAt.setDate(quoteExpiresAt.getDate() + 30);
  
  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      
      // Customer info
      customerName: input.customerInfo.name,
      customerEmail: input.customerInfo.email,
      customerPhone: input.customerInfo.phone,
      customerCompany: input.customerInfo.company,
      
      // Account manager (can be assigned later if not provided)
      accountManagerEmail: input.accountManagerEmail,
      
      // Shipping
      shippingAddress: input.shippingAddress as unknown as Prisma.JsonObject,
      poNumber: input.poNumber,
      inHandsDate: input.inHandsDate ? new Date(input.inHandsDate) : undefined,
      
      // Pricing
      subtotal: new Prisma.Decimal(input.pricing.subtotal),
      decorationTotal: new Prisma.Decimal(input.pricing.decorationTotal),
      setupFees: new Prisma.Decimal(input.pricing.setupFees),
      shipping: new Prisma.Decimal(input.pricing.shipping),
      tax: new Prisma.Decimal(input.pricing.tax),
      total: new Prisma.Decimal(input.pricing.total),
      
      // Status
      status: QuoteStatus.PENDING_APPROVAL,
      notes: input.notes,
      expiresAt: quoteExpiresAt,
      
      // Items
      items: {
        create: input.items.map((item) => ({
          canonicalStyleId: item.canonicalStyleId,
          styleNumber: item.styleNumber,
          productName: item.productName,
          supplierPartId: item.supplierPartId,
          colorCode: item.colorCode,
          colorName: item.colorName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.unitPrice * item.quantity),
          decorations: item.decorations as unknown as Prisma.JsonArray,
          imageUrl: item.imageUrl,
        })),
      },
      
      // Approval token
      approvalToken: {
        create: {
          token: approvalToken,
          expiresAt: tokenExpiresAt,
        },
      },
    },
    include: {
      items: true,
      approvalToken: true,
    },
  });
  
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    total: Number(quote.total),
    submittedAt: quote.submittedAt,
  };
}

/**
 * Get quote by ID with all details
 */
export async function getQuoteById(quoteId: string) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: true,
      approvalToken: true,
    },
  });
}

/**
 * Get quote by quote number
 */
export async function getQuoteByNumber(quoteNumber: string) {
  return prisma.quote.findUnique({
    where: { quoteNumber },
    include: {
      items: true,
    },
  });
}

/**
 * Get quote by approval token (for email link approval)
 */
export async function getQuoteByApprovalToken(token: string) {
  const tokenRecord = await prisma.quoteApprovalToken.findUnique({
    where: { token },
    include: {
      quote: {
        include: {
          items: true,
        },
      },
    },
  });
  
  if (!tokenRecord) {
    return { error: 'Invalid token', quote: null };
  }
  
  if (tokenRecord.usedAt) {
    return { error: 'Token already used', quote: tokenRecord.quote };
  }
  
  if (new Date() > tokenRecord.expiresAt) {
    return { error: 'Token expired', quote: tokenRecord.quote };
  }
  
  return { error: null, quote: tokenRecord.quote };
}

/**
 * Approve a quote
 */
export async function approveQuote(
  quoteId: string,
  accountManagerId?: string,
  accountManagerName?: string,
  internalNotes?: string
) {
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.APPROVED,
      reviewedAt: new Date(),
      approvedAt: new Date(),
      accountManagerId,
      accountManagerName,
      internalNotes,
    },
    include: {
      items: true,
      approvalToken: true,
    },
  });
  
  // Mark token as used
  if (quote.approvalToken) {
    await prisma.quoteApprovalToken.update({
      where: { id: quote.approvalToken.id },
      data: { usedAt: new Date() },
    });
  }
  
  return quote;
}

/**
 * Reject a quote
 */
export async function rejectQuote(
  quoteId: string,
  rejectionReason: string,
  accountManagerId?: string,
  accountManagerName?: string
) {
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.REJECTED,
      reviewedAt: new Date(),
      rejectionReason,
      accountManagerId,
      accountManagerName,
    },
    include: {
      items: true,
      approvalToken: true,
    },
  });
  
  // Mark token as used
  if (quote.approvalToken) {
    await prisma.quoteApprovalToken.update({
      where: { id: quote.approvalToken.id },
      data: { usedAt: new Date() },
    });
  }
  
  return quote;
}

/**
 * Get pending quotes for account manager
 */
export async function getPendingQuotes(accountManagerEmail?: string) {
  const where: Prisma.QuoteWhereInput = {
    status: QuoteStatus.PENDING_APPROVAL,
  };
  
  if (accountManagerEmail) {
    where.accountManagerEmail = accountManagerEmail;
  }
  
  return prisma.quote.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });
}

/**
 * Get quotes for a customer
 */
export async function getCustomerQuotes(customerEmail: string) {
  return prisma.quote.findMany({
    where: {
      customerEmail,
    },
    include: {
      items: true,
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });
}

/**
 * Convert approved quote to order (to be sent to Promos Ink API)
 */
export async function convertQuoteToOrder(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });
  
  if (!quote) {
    throw new Error('Quote not found');
  }
  
  if (quote.status !== QuoteStatus.APPROVED) {
    throw new Error('Quote must be approved before converting to order');
  }
  
  // Update quote status
  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.CONVERTED,
    },
  });
  
  // Return order data formatted for Promos Ink API
  return {
    partnerCode: 'PORTAL',
    externalOrderId: `ORDER-${quote.quoteNumber}`,
    customerInfo: {
      name: quote.customerName,
      email: quote.customerEmail,
      phone: quote.customerPhone,
      company: quote.customerCompany,
    },
    shippingAddress: quote.shippingAddress,
    items: quote.items.map((item) => ({
      styleNumber: item.styleNumber,
      productName: item.productName,
      supplierPartId: item.supplierPartId,
      canonicalStyleId: item.canonicalStyleId,
      color: item.colorCode,
      colorName: item.colorName,
      size: item.size,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      decorations: item.decorations,
    })),
    shipping: {
      method: 'ground',
      cost: Number(quote.shipping),
    },
    pricing: {
      subtotal: Number(quote.subtotal),
      decorationTotal: Number(quote.decorationTotal),
      setupFees: Number(quote.setupFees),
      shipping: Number(quote.shipping),
      tax: Number(quote.tax),
      total: Number(quote.total),
    },
    notes: quote.notes,
    inHandsDate: quote.inHandsDate?.toISOString(),
    poNumber: quote.poNumber,
    quoteNumber: quote.quoteNumber,
  };
}

