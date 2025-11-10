/* eslint-disable @next/next/no-head-element */
import type { PortalQuoteRecord, PortalQuoteItem } from "@/lib/types";

interface QuotePrinterProps {
  quote: PortalQuoteRecord;
  formattedTotal: string;
}

export function QuotePrinter({ quote, formattedTotal }: QuotePrinterProps) {
  const contactName = quote.customer_context?.contact_name || (quote.metadata && typeof (quote.metadata as Record<string, unknown>).customer_name === "string"
    ? String((quote.metadata as Record<string, unknown>).customer_name)
    : "Portal Customer");

  const logistics = quote.logistics || {};
  const shipTo = logistics.ship_to || {};

  const pricingSummary = quote.pricing?.summary;

  return (
    <html lang="en">
      <head>
        <title>Quote {quote.quote_number} — Promos Ink</title>
        <style>{`
          * { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          body { background: #f8fafc; margin: 0; padding: 2rem; color: #0f172a; }
          .sheet { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 18px 60px -42px rgba(15,23,42,0.45); }
          h1 { font-size: 28px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 32px; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { text-align: left; text-transform: uppercase; font-size: 12px; letter-spacing: 0.2em; color: #94a3b8; padding: 8px 0; border-bottom: 1px solid rgba(148,163,184,0.35); }
          td { padding: 12px 0; border-bottom: 1px solid rgba(148,163,184,0.2); font-size: 14px; }
          .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
          .summary { display: flex; justify-content: space-between; margin-top: 24px; }
          .summary div { text-align: right; }
          @media print {
            body { background: #fff; padding: 0; }
            .sheet { box-shadow: none; border-radius: 0; }
            .print-button { display: none; }
          }
          .print-button { position: fixed; top: 24px; right: 24px; }
        `}</style>
      </head>
      <body>
        <div className="sheet">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1>Quote {quote.quote_number}</h1>
              <p style={{ margin: 0, color: "#64748b" }}>Promos Ink • support@promosink.com • (555) 123-4567</p>
            </div>
            <div style={{ textAlign: "right", fontSize: "13px", color: "#475569" }}>
              <p style={{ margin: 0 }}>Prepared for:</p>
              <strong>{contactName}</strong>
              <p style={{ margin: "4px 0 0" }}>Generated: {new Date(quote.created_at).toLocaleString()}</p>
            </div>
          </header>

          <section>
            <h2>Line items</h2>
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
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
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.supplier_label ?? item.supplier ?? "—"}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{item.sku || "—"}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name || "—"}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {item.color || ""} {item.size ? `/ ${item.size}` : ""}
                        </div>
                        {placement && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Placement: {placement}</div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        <div>${item.unit_price.toFixed(2)}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Base ${item.base_cost.toFixed(2)} • Markup {(item.markup_percentage * 100).toFixed(0)}%</div>
                      </td>
                      <td>
                        <div>{item.decoration.method || "Auto"}</div>
                        {item.decoration.notes && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{item.decoration.notes}</div>
                        )}
                        {item.decoration.unit_price > 0 && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Add-on ${item.decoration.unit_price.toFixed(2)}</div>
                        )}
                      </td>
                      <td>
                        {item.warehouse_allocations.length > 0 ? (
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "11px", color: "#475569" }}>
                            {item.warehouse_allocations.map((allocation) => (
                              <li key={`${allocation.warehouse}-${allocation.quantity}`}>
                                {allocation.warehouse} — {allocation.quantity}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Not specified</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Summary</h2>
            <div className="summary">
              <div>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.2em" }}>Total</p>
                <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: 600 }}>
                  {formattedTotal}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.2em" }}>Status</p>
                <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 500 }}>{quote.status}</p>
              </div>
            </div>
            {pricingSummary && (
              <div style={{ marginTop: "16px", background: "#eff6ff", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#3b82f6" }}>Breakdown</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: "13px", color: "#1e3a8a" }}>
                  <li>Blanks: ${pricingSummary.blanks_total.toFixed(2)}</li>
                  <li>Decoration: ${pricingSummary.decoration_total.toFixed(2)}</li>
                  <li>Extras: ${pricingSummary.additional_fees_total.toFixed(2)}</li>
                  <li>Subtotal: ${pricingSummary.subtotal.toFixed(2)}</li>
                </ul>
              </div>
            )}
          </section>

          <section>
            <h2>Notes</h2>
            <p style={{ fontSize: "14px", color: "#475569" }}>
              {quote.notes || "No additional notes captured."}
            </p>
          </section>

          <section>
            <h2>Logistics</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", fontSize: "13px", color: "#475569" }}>
              <div>
                <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "11px", color: "#94a3b8" }}>Ship to</p>
                <p style={{ margin: "4px 0 0" }}>
                  {shipTo.name || "—"}
                  {shipTo.company ? <><br />{shipTo.company}</> : null}
                  {shipTo.address1 ? <><br />{shipTo.address1}</> : null}
                  {shipTo.address2 ? <><br />{shipTo.address2}</> : null}
                  {(shipTo.city || shipTo.state || shipTo.postal_code) && (
                    <>
                      <br />
                      {[shipTo.city, shipTo.state, shipTo.postal_code].filter(Boolean).join(", ")}
                    </>
                  )}
                  {shipTo.country ? <><br />{shipTo.country}</> : null}
                </p>
                {(shipTo.phone || shipTo.email) && (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                    {shipTo.phone || ""} {shipTo.phone && shipTo.email ? "• " : ""}
                    {shipTo.email || ""}
                  </p>
                )}
              </div>
              <div>
                <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "11px", color: "#94a3b8" }}>Schedule</p>
                <p style={{ margin: "4px 0 0" }}>
                  In-hand date: {logistics.in_hand_date ? new Date(logistics.in_hand_date).toLocaleDateString() : "—"}
                  <br />
                  Shipping method: {logistics.shipping_method || "—"}
                  <br />
                  Customer PO: {logistics.customer_po || "—"}
                </p>
              </div>
            </div>
          </section>

          <div style={{ marginTop: "32px", padding: "12px 16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid rgba(148,163,184,0.35)", fontSize: "12px", color: "#475569" }}>
            Use your browser’s print dialog (Ctrl+P / ⌘P) to save this quote as PDF.
          </div>

          <footer className="footer">
            This quote is valid for 30 days. Approval authorizes Promos Ink to proceed with production per the terms above.
          </footer>
        </div>
      </body>
    </html>
  );
}
