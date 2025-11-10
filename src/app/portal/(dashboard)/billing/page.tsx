import { PageHeader } from "@/components/portal/page-header";
import { TableHeader } from "@/components/ui/table-header";
import { buttonVariants } from "@/components/ui/button";
import { dashboardFetchText } from "@/lib/api-client";
import { DashboardRequestError } from "@/lib/api-client";
import { getPortalConfig, isPortalConfigured, PortalConfigError } from "@/lib/config";
import { parseCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/utils";

interface BillingPageProps {
  searchParams?: Promise<{
    month?: string;
  }>;
}

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const configured = isPortalConfigured();
  const config = getPortalConfig();
  const resolvedParams = searchParams ? await searchParams : undefined;
  const month = resolvedParams?.month || getDefaultMonth();

  let csvRows: Array<Record<string, string>> = [];
  let infoMessage: string | null = null;
  let errorMessage: string | null = null;

  const baseUrl = config.apiBaseUrl
    ? config.apiBaseUrl.startsWith("http")
      ? config.apiBaseUrl
      : `https://${config.apiBaseUrl}`
    : "";

  if (configured && config.customerId) {
    try {
      const response = await dashboardFetchText("/api/admin/invoices/export", {
        searchParams: {
          customer_id: config.customerId,
          month,
        },
      });

      const trimmed = response.trim();
      if (!trimmed) {
        infoMessage = "No invoices for the selected month.";
      } else if (trimmed.startsWith("{")) {
        try {
          const json = JSON.parse(trimmed) as { message?: string; csv?: string };
          if (json.csv) {
            csvRows = parseCsv(json.csv).rows;
          } else {
            infoMessage = json.message || "No invoices returned.";
          }
        } catch {
          errorMessage = "Unexpected JSON payload from billing export.";
        }
      } else {
        csvRows = parseCsv(response).rows;
        if (csvRows.length === 0) {
          infoMessage = "No invoices for the selected month.";
        }
      }
    } catch (error) {
      if (error instanceof PortalConfigError || error instanceof DashboardRequestError) {
        errorMessage = error.message;
      } else {
        errorMessage = (error as Error).message;
      }
    }
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title="Billing & invoices"
        description="Give customers visibility into statements, balances, and payment status straight from Fulfillment."
      />

      <div className="card p-6">
        <form className="flex flex-wrap items-end gap-4 text-sm">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Month (YYYY-MM)</label>
            <input
              name="month"
              defaultValue={month}
              placeholder="2025-11"
              className="mt-2 w-32 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <button type="submit" className={buttonVariants("primary")}>
            Refresh
          </button>
          {configured && config.customerId && baseUrl && (
            <a
              href={`${baseUrl}/api/admin/invoices/export?customer_id=${encodeURIComponent(
                config.customerId
              )}&month=${encodeURIComponent(month)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants("secondary")}
            >
              Download CSV
            </a>
          )}
        </form>
      </div>

      {!configured && (
        <div className="card border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
          Configure API credentials and <code className="font-mono">PORTAL_CUSTOMER_ID</code> to pull billing data.
        </div>
      )}

      {errorMessage && (
        <div className="card border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700">
          <p className="font-semibold text-rose-800">Billing export failed.</p>
          <p className="mt-1 text-rose-700/90">{errorMessage}</p>
          <a className={buttonVariants("secondary") + " mt-3 w-fit"} href={`/portal/billing?month=${month}`}>
            Try again
          </a>
        </div>
      )}

      {infoMessage && !errorMessage && (
        <div className="empty-state">{infoMessage}</div>
      )}

      {configured && !errorMessage && csvRows.length > 0 && (
        <div className="card overflow-hidden">
          <TableHeader title="Statement" description={`Showing ${csvRows.length} rows for ${month}.`} />
          <div className="overflow-x-auto px-4 pb-4 pt-2">
            <table className="table-grid text-sm">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Amount due</th>
                </tr>
              </thead>
              <tbody>
                {csvRows.map((row) => (
                  <tr key={row.invoice_number}>
                    <td className="text-slate-700">{row.invoice_number}</td>
                    <td className="text-slate-600">{row.invoice_date}</td>
                    <td className="capitalize text-slate-600">{row.status || "draft"}</td>
                    <td className="text-right text-slate-700">{formatCurrency(row.subtotal)}</td>
                    <td className="text-right text-slate-900 font-medium">{formatCurrency(row.line_total || row.total)}</td>
                    <td className="text-right text-slate-700">{formatCurrency(row.amount_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Next steps</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Sync invoice exports to QuickBooks/Xero via nightly job.</li>
          <li>Attach hosted payment links (Stripe/Adyen) per invoice.</li>
          <li>Expose ACH remittance upload for client accounting teams.</li>
        </ul>
      </div>
    </section>
  );
}


