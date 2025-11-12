import { randomUUID } from 'crypto';

import { calculateLinePricing } from '@/lib/pricing';
import { sendEmail } from '@/lib/email';
import type { QuoteLineResponse, QuoteRequest, QuoteResponse } from '@/lib/types';
import { getProductBaseBlankCost } from '@/services/catalog-repository';

const quotes: QuoteResponse[] = [];

export async function createQuote(payload: QuoteRequest): Promise<QuoteResponse> {
  if (!payload.lines?.length) {
    throw new Error('Quote requires at least one line');
  }

  const normalizedLines: QuoteLineResponse[] = await Promise.all(
    payload.lines.map(async (line) => {
      const baseBlankCost = await getProductBaseBlankCost(line.supplierPartId);
      const pricing = calculateLinePricing({
        supplierPartId: line.supplierPartId,
        colorCode: line.colorCode,
        sizeCode: line.sizeCode,
        qty: line.qty,
        decoration: line.decoration ?? null,
        baseBlankCost: baseBlankCost ?? undefined,
      });

      return {
        ...line,
        pricing,
      };
    })
  );

  const subtotal = normalizedLines.reduce((sum, line) => sum + line.pricing.extendedPrice, 0);
  const quote: QuoteResponse = {
    quoteId: randomUUID(),
    subtotal,
    lines: normalizedLines,
    customerInfo: payload.customerInfo ?? null,
    shipTo: payload.shipTo ?? null,
    needBy: payload.needBy ?? null,
    notes: payload.notes ?? null,
    proofRequested: payload.proofRequested ?? false,
  };

  quotes.push(quote);

  triggerQuoteEmail(quote).catch((error) => {
    console.error('Failed to send quote email', error);
  });

  return quote;
}

export function listQuotes(): QuoteResponse[] {
  return quotes.slice();
}

async function triggerQuoteEmail(summary: QuoteResponse) {
  const recipients = (process.env.QUOTE_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!recipients.length) {
    return;
  }

  const customerName = summary.customerInfo?.name ?? 'Customer';
  const subtotal = summary.subtotal.toFixed(2);
  const subject = `Quote ${summary.quoteId} • ${customerName} • $${subtotal}`;

  const lineRows = summary.lines
    .map(
      (line) =>
        `<tr>
          <td>${line.supplierPartId} • ${line.colorCode} • ${line.sizeCode}</td>
          <td style="text-align:right;">${line.qty}</td>
          <td style="text-align:right;">$${line.pricing.unitPrice.toFixed(2)}</td>
          <td style="text-align:right;">$${line.pricing.extendedPrice.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <h2>New quote submitted</h2>
    <p><strong>Quote ID:</strong> ${summary.quoteId}</p>
    <p><strong>Subtotal:</strong> $${subtotal}</p>
    <p><strong>Proof requested:</strong> ${summary.proofRequested ? 'Yes' : 'No'}</p>
    <p><strong>Customer:</strong> ${summary.customerInfo?.name ?? '—'} (${summary.customerInfo?.email ?? '—'})</p>
    <p><strong>Ship to:</strong> ${summary.shipTo?.line1 ?? '—'}, ${summary.shipTo?.city ?? ''} ${summary.shipTo?.state ?? ''} ${
    summary.shipTo?.postalCode ?? ''
  }</p>
    <p><strong>Need by:</strong> ${summary.needBy ?? '—'}</p>
    <p><strong>Notes:</strong> ${summary.notes ?? '—'}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr>
          <th style="text-align:left;">Line</th>
          <th style="text-align:right;">Qty</th>
          <th style="text-align:right;">Unit</th>
          <th style="text-align:right;">Extended</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
  `;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured; skipping quote email');
    return;
  }

  await sendEmail({ to: recipients, subject, html });
}
