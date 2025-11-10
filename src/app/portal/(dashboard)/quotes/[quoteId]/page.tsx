import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard, StatTile } from "@/components/portal/page-shell";
import { dashboardFetch } from "@/lib/api-client";
import { DashboardRequestError } from "@/lib/api-client";
import { isPortalConfigured, PortalConfigError } from "@/lib/config";
import type { PortalQuoteItem, PortalQuoteRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ConvertQuoteButton } from "@/components/quotes/convert-quote-button";

async function fetchQuote(id: string) {
  try {
    const data = await dashboardFetch<{ success: boolean; quote: PortalQuoteRecord }>(
      `/api/portal/quotes/${id}`
    );
    if (!data.success) {
      return { quote: null, error: "Quote not found" };
    }
    return { quote: data.quote, error: null };
  } catch (error) {
    if (error instanceof PortalConfigError || error instanceof DashboardRequestError) {
      return { quote: null, error: error.message };
    }
    return { quote: null, error: (error as Error).message };
  }
}

const STATUS_THEME: Record<string, { badge: string; pill: string }> = {
  converted: {
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    pill: "bg-emerald-500/15 text-emerald-600",
  },
  draft: {
    badge: "bg-slate-200 text-slate-700 border border-slate-300",
    pill: "bg-slate-500/10 text-slate-600",
  },
  sent: {
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    pill: "bg-blue-500/15 text-blue-600",
  },
  accepted: {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    pill: "bg-amber-500/15 text-amber-600",
  },
};

export default async function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  if (!isPortalConfigured()) {
    notFound();
  }

  const { quote, error } = await fetchQuote(quoteId);

  if (error) {
    return (
      <PortalPageShell header={<PageHeader overline="Quotes" title="Quote" description="We couldn’t load the requested quote." />}>
        <SectionCard overline="Error" title="Unable to load quote" description={error}>
          <p className="muted text-sm">Try refreshing the page or returning to the quote list to reselect a record.</p>
        </SectionCard>
      </PortalPageShell>
    );
  }

  if (!quote) {
    notFound();
  }

  const statusTheme = STATUS_THEME[quote.status] || STATUS_THEME.draft;
  const contact = quote.customer_context ?? {};
  const logistics = quote.logistics ?? {};
  const shipTo = logistics.ship_to ?? {};
  const artwork = quote.artwork ?? { files: [] };
  const proof = quote.workflow?.proof;
  const pricingSummary = quote.pricing?.summary;

  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="Quotes"
          title={`Quote ${quote.quote_number}`}
          description={`Created ${new Date(quote.created_at).toLocaleString()}`}
          actions={
            <div className="cluster">
              <Link href="/portal/quotes" className="glass-button">
                Back to quotes
              </Link>
              <ConvertQuoteButton quoteId={quote.id} disabled={quote.status === "converted"} />
            </div>
          }
        />
      }
    >
      <SectionCard
        overline="Summary"
        title="Quote overview"
        description="Status, totals, and key contacts for this submission."
        actions={<span className={`badge ${statusTheme.badge}`}>{quote.status}</span>}
      >
        <div className="auto-grid">
          <StatTile label="Total value" value={formatCurrency(quote.total, quote.currency ?? undefined)} helper={`Last updated ${new Date(quote.updated_at).toLocaleString()}`} />
          <StatTile label="Submitted" value={quote.submitted_at ? new Date(quote.submitted_at).toLocaleString() : "—"} helper={quote.title || "Untitled quote"} />
          <StatTile label="Customer ID" value={quote.customer_id.slice(0, 8)} helper="Masked for privacy" />
        </div>

        <div className="stack-md">
          <div className="stack-sm">
            <span className="overline">Primary contact</span>
            <div className="muted text-sm">
              {contact.contact_name || "—"}
              {(contact.contact_email || contact.contact_phone) && (
                <span className="block text-xs">
                  {[contact.contact_email, contact.contact_phone].filter(Boolean).join(" • ")}
                </span>
              )}
            </div>
          </div>
          <div className="stack-sm">
            <span className="overline">Internal notes</span>
            <p className="muted text-sm whitespace-pre-wrap">{quote.notes || "No notes captured."}</p>
          </div>
          <div className="stack-sm">
            <span className="overline">Metadata</span>
            <pre className="max-h-60 overflow-x-auto overflow-y-auto rounded-lg bg-slate-900/90 p-4 text-xs text-slate-100">
{JSON.stringify(quote.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        overline="Line items"
        title="Supplier breakdown"
        description="Markup, decoration, and allocation details captured on this quote."
      >
        {quote.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-grid text-sm">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Line total</th>
                  <th>Decoration</th>
                  <th>Warehouses</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item: PortalQuoteItem, index) => {
                  const placementValue = item.metadata?.placement;
                  const placement =
                    placementValue == null
                      ? undefined
                      : typeof placementValue === "string"
                      ? placementValue
                      : String(placementValue);

                  return (
                    <tr key={`${item.sku}-${index}`}>
                    <td data-label="Supplier" className="font-medium text-white/85">
                      {item.supplier_label ?? item.supplier ?? "—"}
                      <div className="font-mono text-[11px] text-cyan-200/80">{item.sku || "—"}</div>
                    </td>
                    <td data-label="Description">
                      <div className="text-white/90">{item.product_name || "—"}</div>
                      <div className="text-xs text-slate-300/80">
                        {[item.color, item.size].filter(Boolean).join(" / ") || ""}
                      </div>
                      {placement && (
                        <div className="text-[11px] text-slate-400">Placement: {placement}</div>
                      )}
                    </td>
                    <td data-label="Qty" className="text-right">
                      {item.quantity}
                    </td>
                    <td data-label="Unit" className="text-right">
                      {formatCurrency(item.unit_price)}
                      <div className="text-[11px] text-slate-400">
                        Base {formatCurrency(item.base_cost)} • Markup {(item.markup_percentage * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td data-label="Line total" className="text-right font-medium text-white">
                      {formatCurrency(item.pricing.line_total)}
                    </td>
                    <td data-label="Decoration">
                      <div className="uppercase text-xs tracking-[0.2em] text-slate-300/80">{item.decoration.method || "auto"}</div>
                      {item.decoration.notes && <div className="text-[11px] text-slate-400">{item.decoration.notes}</div>}
                      {item.decoration.unit_price > 0 && (
                        <div className="text-[11px] text-slate-400">Add-on {formatCurrency(item.decoration.unit_price)}</div>
                      )}
                    </td>
                    <td data-label="Warehouses">
                      {item.warehouse_allocations.length > 0 ? (
                        <ul className="space-y-1 text-xs text-slate-200/80">
                          {item.warehouse_allocations.map((allocation) => (
                            <li key={`${allocation.warehouse}-${allocation.quantity}`}>
                              {allocation.warehouse} • {allocation.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-500">Not specified</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No line items recorded on this quote.</div>
        )}
      </SectionCard>

      <div className="auto-grid">
        <SectionCard
          overline="Pricing"
          title="Financial breakdown"
          description="Snapshot of blanks, decoration, and supplier totals."
        >
          {pricingSummary ? (
            <div className="stack-md">
              <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <StatTile label="Blank total" value={formatCurrency(pricingSummary.blanks_total)} />
                <StatTile label="Decoration" value={formatCurrency(pricingSummary.decoration_total)} />
                <StatTile label="Extras" value={formatCurrency(pricingSummary.additional_fees_total)} />
                <StatTile label="Grand total" value={formatCurrency(pricingSummary.grand_total)} />
              </div>
              <div className="stack-sm rounded-xl border border-white/12 bg-white/6 p-4 text-xs text-slate-100">
                <span className="overline">Supplier breakdown</span>
                <ul className="stack-xs">
                  {Object.entries(pricingSummary.supplier_breakdown || {}).map(([supplierKey, values]) => (
                    <li key={supplierKey} className="flex items-center justify-between">
                      <span>{supplierKey}</span>
                      <span className="font-medium text-white">
                        {formatCurrency(values.blanks)} • {values.quantity} pcs
                      </span>
                    </li>
                  ))}
                  {(!pricingSummary.supplier_breakdown || Object.keys(pricingSummary.supplier_breakdown).length === 0) && (
                    <li className="text-slate-300/70">No supplier allocation recorded.</li>
                  )}
                </ul>
              </div>
              <details className="rounded-xl border border-white/12 bg-slate-900/90 text-slate-100">
                <summary className="cursor-pointer px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Raw pricing payload
                </summary>
                <pre className="max-h-72 overflow-x-auto overflow-y-auto px-4 pb-4 pt-2 text-[11px]">
{JSON.stringify(quote.pricing ?? {}, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="empty-state">No pricing summary captured.</div>
          )}
        </SectionCard>

        <SectionCard overline="Routing" title="Production routing">
          <pre className="max-h-80 overflow-x-auto overflow-y-auto rounded-lg bg-slate-900/90 p-4 text-xs text-slate-100">
{JSON.stringify(quote.routing ?? {}, null, 2)}
          </pre>
        </SectionCard>
      </div>

      <div className="auto-grid">
        <SectionCard
          overline="Logistics"
          title="Ship-to details"
          description="Address and scheduling information supplied by the customer."
        >
          <div className="stack-md">
            <div className="stack-xs">
              <span className="overline">Ship to</span>
              <p className="muted whitespace-pre-line text-sm">
                {[shipTo.name, shipTo.company, shipTo.address1, shipTo.address2, [shipTo.city, shipTo.state, shipTo.postal_code].filter(Boolean).join(", "), shipTo.country]
                  .filter((line) => line && String(line).trim().length > 0)
                  .map(String)
                  .join("\n") || "—"}
              </p>
              {(shipTo.phone || shipTo.email) && (
                <p className="text-xs text-slate-300/80">
                  {[shipTo.phone, shipTo.email].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
            <div className="stack-xs">
              <span className="overline">In-hand date</span>
              <p className="muted text-sm">{logistics.in_hand_date ? new Date(logistics.in_hand_date).toLocaleDateString() : "—"}</p>
            </div>
            <div className="stack-xs">
              <span className="overline">Shipping method</span>
              <p className="muted text-sm capitalize">{logistics.shipping_method || "—"}</p>
            </div>
            <div className="stack-xs">
              <span className="overline">Customer PO</span>
              <p className="muted text-sm">{logistics.customer_po || "—"}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          overline="Assets"
          title="Artwork & workflow"
          description="Files submitted with this quote and current proof status."
        >
          <div className="stack-md text-sm text-slate-200/80">
            <div>
              <span className="overline">Artwork notes</span>
              <p className="muted text-sm">{artwork.notes || "No additional notes."}</p>
            </div>
            <div>
              <span className="overline">Files</span>
              {artwork.files && artwork.files.length > 0 ? (
                <ul className="stack-sm text-xs">
                  {artwork.files.map((file, index) => (
                    <li key={`${file.url ?? index}`} className="rounded-lg border border-white/12 bg-white/6 p-3">
                      <p className="font-medium text-white/90">{file.filename || file.url || "Untitled asset"}</p>
                      {file.url && (
                        <p className="text-[11px] text-cyan-200">
                          <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">
                            {file.url}
                          </a>
                        </p>
                      )}
                      {file.notes && <p className="text-[11px] text-slate-300/80">{file.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No artwork uploaded.</p>
              )}
            </div>
            <div>
              <span className="overline">Proof status</span>
              <p className="muted text-sm">
                {proof?.status || "pending"}
                {proof?.approved_at && (
                  <span className="block text-xs text-slate-400">
                    Approved {new Date(proof.approved_at).toLocaleString()} by {proof.approved_by || "customer"}
                  </span>
                )}
                {proof?.notes && <span className="block text-xs text-slate-400">{proof.notes}</span>}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </PortalPageShell>
  );
}
