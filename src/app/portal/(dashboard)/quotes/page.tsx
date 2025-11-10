import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard } from "@/components/portal/page-shell";
import { dashboardFetch } from "@/lib/api-client";
import { DashboardRequestError } from "@/lib/api-client";
import { PortalConfigError, isPortalConfigured } from "@/lib/config";
import type { PortalQuotesResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

async function getQuotes(): Promise<{ data: PortalQuotesResponse | null; error?: string }> {
  if (!isPortalConfigured()) {
    return { data: null };
  }

  try {
    const response = await dashboardFetch<PortalQuotesResponse>("/api/portal/quotes", {
      searchParams: { limit: 100 },
    });
    return { data: response };
  } catch (error) {
    if (error instanceof PortalConfigError || error instanceof DashboardRequestError) {
      return { data: null, error: error.message };
    }
    return { data: null, error: (error as Error).message };
  }
}

export default async function QuotesIndexPage() {
  const { data, error } = await getQuotes();
  const configured = isPortalConfigured();

  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="Quotes"
          title="Quote workspace"
          description="Generate decorated pricing, share proofs, and convert approved work to production orders."
          actions={
            <Link href="/portal/quotes/new" className="glass-button">
              Start a new quote
            </Link>
          }
        />
      }
    >
      {error && (
        <SectionCard overline="Error" title="Unable to load quotes" description={error}>
          <p className="muted text-sm">We couldn’t fetch the latest quotes. Try reloading or confirm the dashboard API is reachable.</p>
        </SectionCard>
      )}

      {!configured && !error && (
        <SectionCard
          overline="Configuration"
          title="Connect the dashboard API"
          description="Configure API credentials to generate and view quotes in the customer workspace."
        >
          <p className="muted text-sm">Once the connection is live, customer submissions and CSR updates will populate this log automatically.</p>
        </SectionCard>
      )}

      {configured && !error && (
        <SectionCard
          overline="Quote log"
          title="Latest 100 quotes"
          description="Status, value, and staleness for the most recent customer submissions."
        >
          <div className="overflow-x-auto">
            <table className="table-grid text-sm">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.quotes || []).map((quote) => (
                  <tr key={quote.id}>
                    <td data-label="Quote #" className="font-mono text-xs text-cyan-200/90">
                      <Link href={`/portal/quotes/${quote.id}`}>{quote.quote_number}</Link>
                    </td>
                    <td data-label="Status" className="capitalize">
                      {quote.status}
                    </td>
                    <td data-label="Total">
                      {formatCurrency(quote.total, quote.currency ?? undefined)}
                    </td>
                    <td data-label="Created" className="muted text-xs">
                      {new Date(quote.created_at).toLocaleString()}
                    </td>
                    <td data-label="Updated" className="muted text-xs">
                      {new Date(quote.updated_at).toLocaleString()}
                    </td>
                    <td data-label="Actions">
                      <Link href={`/portal/quotes/${quote.id}`} className="glass-button">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!data?.quotes || data.quotes.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-300/60">
                      No quotes yet. Create one to view routing, pricing, and conversion history here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </PortalPageShell>
  );
}


