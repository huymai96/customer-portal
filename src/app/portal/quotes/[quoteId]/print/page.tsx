import { notFound } from "next/navigation";
import { dashboardFetch } from "@/lib/api-client";
import type { PortalQuoteRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { QuotePrinter } from "@/components/quotes/quote-printer";

async function fetchQuote(id: string) {
  try {
    const data = await dashboardFetch<{ success: boolean; quote: PortalQuoteRecord }>(
      `/api/portal/quotes/${id}`
    );
    if (!data.success) {
      return null;
    }
    return data.quote;
  } catch {
    return null;
  }
}

export default async function PrintableQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const quote = await fetchQuote(quoteId);
  if (!quote) {
    notFound();
  }

  return (
    <QuotePrinter
      quote={quote}
      formattedTotal={formatCurrency(quote.total, quote.currency ?? undefined)}
    />
  );
}
